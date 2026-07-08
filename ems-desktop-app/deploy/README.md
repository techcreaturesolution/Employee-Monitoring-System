# EMS Agent — SmartScreen Bypass & Deployment Guide

> **Goal**: Eliminate the "Windows protected your PC" SmartScreen prompt when employees install EMS Agent — without buying a commercial certificate.

---

## Why SmartScreen triggers

SmartScreen blocks an `.exe` when **both** of these are true:
1. The file has a **Mark of the Web (MOTW)** — a hidden tag added by browsers when you download something from the internet.
2. The file has **no trust relationship** with the machine running it (no recognised signature, no admin-deployed trust).

The scripts in this folder eliminate both triggers.

---

## Quick-start: pick your path

| Your setup | Best approach | Scripts to run |
|---|---|---|
| Microsoft 365 / Entra ID | **Intune Win32 app** (zero MOTW, no SmartScreen at all) | `build.ps1` → `1_intune_wrap.ps1` |
| On-prem Active Directory | **GPO Software Deployment** (same result as Intune) | `build.ps1` → copy installer to `\\server\share` + GPO |
| No MDM, need signing | **Internal CA + sign** (free, machine-trusted) | `2_setup_internal_ca.ps1` → `build.ps1` with env vars |
| Belt-and-suspenders | **AppLocker allow rule** | `4_applocker_allow_rule.ps1` |

---

## Step-by-step

### Step 1 — Build the installer

```powershell
# Unsigned build (fine when deploying via Intune/GPO):
.\build.ps1

# Signed build (after running 2_setup_internal_ca.ps1):
$env:CSC_LINK         = ".\deploy\certs\EMSCodeSign.pfx"
$env:CSC_KEY_PASSWORD = "your-pfx-password"
.\build.ps1
```

`build.ps1` automatically:
- Builds in a temp dir (avoids path-with-spaces issues)
- Signs with `signtool.exe` if env vars are set
- **Strips Mark-of-the-Web** (`Unblock-File`) from the final `.exe`
- Copies the result to `dist-packaged\`

---

### Step 2A — Deploy via Intune (recommended for Microsoft 365 shops)

```powershell
.\deploy\1_intune_wrap.ps1
```

This creates `deploy\intune-output\EMSAgent.intunewin`.

**Then in the Intune portal:**
1. Apps → Windows → Add → **Windows app (Win32)**
2. Upload `EMSAgent.intunewin`
3. Install command: `EMSAgent Setup 1.2.0.exe /S`
4. Uninstall command: `"C:\Program Files\EMS Agent\Uninstall EMS Agent.exe" /S`
5. Assign to a device group → employees get it silently, **no SmartScreen prompt**

---

### Step 2B — Deploy via Group Policy (on-prem AD)

1. Copy `dist-packaged\*.exe` to a network share, e.g. `\\dc01\Software\EMSAgent\`
2. Open **GPMC** → Create/edit a GPO linked to your employee OU
3. Navigate to:  
   `Computer Config > Policies > Software Settings > Software Installation`
4. New Package → point to the `.exe` on the share → Assigned
5. Employees get it on next login — no MOTW, no SmartScreen

---

### Step 3 — Set up a free internal signing certificate (optional but recommended)

```powershell
# Run as Administrator — no AD CS needed, uses PowerShell built-ins
.\deploy\2_setup_internal_ca.ps1
```

Creates:
- `deploy\certs\EMSInternalCA.cer` — push to all machines via GPO (Trusted Root store)
- `deploy\certs\EMSCodeSign.pfx` — use in build pipeline via `CSC_LINK`

**Push the Root CA via GPO:**
```
Computer Config > Policies > Windows Settings > Security Settings
> Public Key Policies > Trusted Root Certification Authorities
→ Import: EMSInternalCA.cer
```

Once the root CA is trusted org-wide, any binary signed with `EMSCodeSign.pfx` is automatically trusted — zero SmartScreen.

---

### Step 4 — Configure SmartScreen policy (backup option)

```powershell
# Run as Admin on each machine, or deploy via Intune Remediation Script
.\deploy\3_gpo_smartscreen_policy.ps1
```

Sets SmartScreen to **Warn** mode (user can click through) instead of hard-block.

---

### Step 5 — AppLocker allow rule (belt and suspenders)

```powershell
# Run AFTER building — reads the installer hash
.\deploy\4_applocker_allow_rule.ps1
```

Exports `deploy\EMSAgent_AppLocker_Policy.xml` — import into AppLocker via GPO or Intune to explicitly whitelist EMS Agent.

---

## Environment variables for `build.ps1`

| Variable | Purpose | Example |
|---|---|---|
| `CSC_LINK` | Path to `.pfx` certificate file | `.\deploy\certs\EMSCodeSign.pfx` |
| `CSC_KEY_PASSWORD` | PFX file password | `MySecretPw` |
| `CERT_SUBJECT_NAME` | Subject name of cert already in Windows store | `EMS Agent` |
| `TIMESTAMP_SERVER` | RFC 3161 timestamp server (default: DigiCert) | `http://timestamp.digicert.com` |

> **Never commit `CSC_KEY_PASSWORD` to Git.** Set it only in your terminal session or CI secret store.

---

## What was changed in the codebase

| File | What changed |
|---|---|
| `package.json` | Added `signingHashAlgorithms`, `sign`, `requestedExecutionLevel` to `win` block; improved NSIS config |
| `build.ps1` | Added signing step, MOTW stripping, better output formatting |
| `scripts/sign.js` | New — custom electron-builder signing hook, reads env vars |
| `deploy/1_intune_wrap.ps1` | New — wraps installer into `.intunewin` for Intune |
| `deploy/2_setup_internal_ca.ps1` | New — creates free internal Root CA + code signing cert |
| `deploy/3_gpo_smartscreen_policy.ps1` | New — configures SmartScreen via registry/GPO |
| `deploy/4_applocker_allow_rule.ps1` | New — creates AppLocker hash-allow rule |
