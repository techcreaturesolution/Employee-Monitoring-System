# PowerShell Build Script for EMS Desktop App
# Bypasses space-in-path and locks by copying to a temporary directory without spaces.

$ErrorActionPreference = "Stop"

# 1. Stop any running Electron instances to release file locks
Write-Host "Stopping any running Electron processes..." -ForegroundColor Cyan
Get-Process | Where-Object { $_.Name -like "*electron*" -or $_.Name -like "*ems*" } | Stop-Process -Force -ErrorAction SilentlyContinue

$SrcDir = "E:\Tech Creature solution\EMS\Employee-Monitoring-System\ems-desktop-app"
$TmpDir = "E:\EMS_Desktop_Build"

# 2. Re-create clean temp build directory
Write-Host "Creating clean temporary build directory at $TmpDir..." -ForegroundColor Cyan
if (Test-Path $TmpDir) {
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $TmpDir | Out-Null

# 3. Fast copy using Robocopy (excluding dist-packaged)
Write-Host "Copying project files to temporary directory..." -ForegroundColor Cyan
robocopy $SrcDir $TmpDir /E /XD "dist-packaged" /R:1 /W:1 | Out-Null

# Robocopy exit codes < 8 mean success
if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed to copy files. Exit code: $LASTEXITCODE"
}

# 4. Run build inside the temp directory
Write-Host "Building and packaging the app in space-free path..." -ForegroundColor Cyan
Set-Location $TmpDir
npm run build

# 5. Copy the packaged installers back to the workspace
Write-Host "Copying packaged installers back to the workspace..." -ForegroundColor Cyan
if (Test-Path "$TmpDir\dist-packaged") {
    if (Test-Path "$SrcDir\dist-packaged") {
        Remove-Item -Recurse -Force "$SrcDir\dist-packaged" -ErrorAction SilentlyContinue
    }
    robocopy "$TmpDir\dist-packaged" "$SrcDir\dist-packaged" /E /R:1 /W:1 | Out-Null
    Write-Host "Build complete! Package installer is available in ems-desktop-app/dist-packaged" -ForegroundColor Green
} else {
    throw "Build completed but no packaged installers were found in $TmpDir\dist-packaged"
}

# 6. Clean up temporary build folder
Write-Host "Cleaning up temporary build folder..." -ForegroundColor Cyan
Set-Location $SrcDir
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
Write-Host "Done!" -ForegroundColor Green
