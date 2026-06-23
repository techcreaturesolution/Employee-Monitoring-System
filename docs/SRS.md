# Employee Desktop Monitoring SaaS — Software Requirements Specification (SRS)

**Version:** 1.0
**Date:** 2026-05-28

---

## 1. Introduction

### 1.1 Purpose
A multi-tenant SaaS platform enabling companies to monitor employee desktop/laptop activity through periodic screenshot capture, punch in/out time tracking, application usage monitoring, and productivity analytics.

### 1.2 Scope
- **Admin Portal** — Web dashboard for company admins/CEOs to manage employees, view screenshots, track attendance, and generate reports.
- **Employee Portal** — Personal dashboard for employees to view their attendance history and activity.
- **Desktop Agent** — Lightweight cross-platform agent that captures screenshots, tracks active applications, and handles punch in/out.
- **Backend API** — RESTful API with multi-tenant architecture, JWT authentication, and role-based access control.

### 1.3 Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Frontend | React, TypeScript, Vite, TailwindCSS |
| Desktop Agent | Node.js (Electron-ready) |
| File Storage | Local/S3-compatible storage |
| Authentication | JWT + bcrypt |
| Real-time | Socket.io |
| Payment | Razorpay |

---

## 2. System Architecture

### 2.1 Multi-Tenant Model
- Shared database with tenant isolation via `tenantId` on all documents
- Tenant = Company/Organization
- Each tenant has its own admin, employees, and settings

### 2.2 User Roles
| Role | Permissions |
|------|------------|
| `super_admin` | Platform-wide management, tenant CRUD, billing oversight |
| `company_admin` | Full company management, employee CRUD, view all screenshots & attendance |
| `manager` | View team members' data, approve attendance |
| `employee` | View own data, punch in/out |

### 2.3 Data Models

#### Tenant
- name, email, domain, phone, address
- logo, plan (free/starter/business/enterprise)
- settings (screenshotInterval, trackApps, blurScreenshots, maxEmployees)
- status (active/suspended/trial)
- subscriptionId, trialEndsAt

#### User
- name, email, password, role, tenantId
- department, designation, employeeId
- avatar, phone, status (active/inactive/suspended)
- agentKey (unique key for desktop agent auth)

#### Attendance
- userId, tenantId, date
- punchIn (timestamp + location + ip + screenshot)
- punchOut (timestamp + location + ip + screenshot)
- breaks[] (start, end, duration, reason)
- totalWorkHours, overtimeHours, status (present/absent/half-day/late)

#### Screenshot
- userId, tenantId, timestamp
- imageUrl, thumbnailUrl
- activeApp, windowTitle
- productivityScore (productive/neutral/unproductive)
- metadata (resolution, fileSize)

#### ActivityLog
- userId, tenantId, timestamp
- appName, windowTitle, duration
- category (productive/neutral/unproductive)
- url (if browser)

#### Project
- name, description, tenantId
- members[], status (active/archived)
- totalTrackedHours

#### Subscription
- tenantId, plan, status
- razorpaySubscriptionId, razorpayPlanId
- currentPeriodStart, currentPeriodEnd
- amount, currency

#### Notification
- tenantId, userId, type
- title, message, read, link

---

## 3. API Endpoints

### 3.1 Auth
- `POST /api/auth/register` — Register company + admin
- `POST /api/auth/login` — Login
- `POST /api/auth/forgot-password` — Password reset request
- `POST /api/auth/reset-password` — Reset password
- `GET /api/auth/me` — Get current user profile

### 3.2 Tenants (Super Admin)
- `GET /api/tenants` — List all tenants
- `GET /api/tenants/:id` — Get tenant details
- `PUT /api/tenants/:id` — Update tenant
- `DELETE /api/tenants/:id` — Deactivate tenant

### 3.3 Employees
- `GET /api/employees` — List employees (by tenant)
- `POST /api/employees` — Add employee
- `GET /api/employees/:id` — Get employee details
- `PUT /api/employees/:id` — Update employee
- `DELETE /api/employees/:id` — Deactivate employee
- `POST /api/employees/:id/regenerate-key` — Regenerate agent key

### 3.4 Attendance
- `POST /api/attendance/punch-in` — Punch in
- `POST /api/attendance/punch-out` — Punch out
- `POST /api/attendance/break/start` — Start break
- `POST /api/attendance/break/end` — End break
- `GET /api/attendance/today` — Get today's attendance
- `GET /api/attendance/history` — Get attendance history
- `GET /api/attendance/report` — Generate attendance report (admin)

### 3.5 Screenshots
- `POST /api/screenshots/upload` — Upload screenshot (from agent)
- `GET /api/screenshots` — List screenshots (filtered by user/date)
- `GET /api/screenshots/:id` — Get screenshot detail
- `DELETE /api/screenshots/:id` — Delete screenshot

### 3.6 Activity
- `POST /api/activity/log` — Log activity (from agent)
- `GET /api/activity` — Get activity logs
- `GET /api/activity/summary` — Get activity summary/analytics

### 3.7 Projects
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project
- `PUT /api/projects/:id` — Update project
- `GET /api/projects/:id/time-entries` — Get time entries

### 3.8 Dashboard
- `GET /api/dashboard/admin` — Admin dashboard stats
- `GET /api/dashboard/employee` — Employee dashboard stats

### 3.9 Reports
- `GET /api/reports/attendance` — Attendance report
- `GET /api/reports/productivity` — Productivity report
- `GET /api/reports/screenshots` — Screenshot activity report
- `GET /api/reports/timesheet` — Timesheet report

### 3.10 Settings
- `GET /api/settings` — Get tenant settings
- `PUT /api/settings` — Update tenant settings

### 3.11 Subscriptions
- `POST /api/subscriptions/create` — Create subscription
- `POST /api/subscriptions/webhook` — Razorpay webhook
- `GET /api/subscriptions/current` — Get current subscription
- `POST /api/subscriptions/cancel` — Cancel subscription

### 3.12 Agent API
- `POST /api/agent/heartbeat` — Agent heartbeat/status
- `POST /api/agent/screenshot` — Upload screenshot
- `POST /api/agent/activity` — Log activity batch
- `GET /api/agent/config` — Get agent configuration

---

## 4. Desktop Agent Features

### 4.1 Screenshot Capture
- Configurable interval (default: 10 minutes)
- Captures active screen
- Compresses and uploads to server
- Optional blur mode for privacy

### 4.2 Time Tracking
- Punch in/out with one click
- Break management
- Idle time detection
- Active time calculation

### 4.3 Application Tracking
- Active window title tracking
- Application usage time
- URL tracking (browser)
- Categorization (productive/neutral/unproductive)

### 4.4 System Tray
- Minimize to system tray
- Status indicator (tracking/paused/offline)
- Quick punch in/out

---

## 5. Subscription Plans

| Feature | Free | Starter | Business | Enterprise |
|---------|------|---------|----------|------------|
| Employees | 5 | 25 | 100 | Unlimited |
| Screenshots | 50/day | 500/day | 2000/day | Unlimited |
| Screenshot Interval | 30 min | 10 min | 5 min | 1 min |
| Activity Tracking | Basic | Full | Full | Full |
| Reports | Basic | Advanced | Advanced | Custom |
| Data Retention | 7 days | 30 days | 90 days | 365 days |
| Support | Community | Email | Priority | Dedicated |
| Price (₹/mo) | 0 | 999 | 2,999 | 9,999 |

---

## 6. Security Requirements
- JWT tokens with refresh mechanism
- Agent authentication via unique API keys
- Screenshot encryption at rest
- Rate limiting on all endpoints
- Input validation with Zod
- CORS configuration per tenant
- Audit logging for sensitive operations
- GDPR-compliant data handling options
