# EMS Backend — Frontend API Reference

**Base URL (dev):** `http://localhost:5000/api`  
**Content-Type:** `application/json` (all POST/PUT requests)  
**Auth:** JWT Bearer token in `Authorization` header  

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Employees](#2-employees)
3. [Attendance](#3-attendance)
4. [Activity Logs](#4-activity-logs)
5. [Screenshots](#5-screenshots)
6. [Dashboard](#6-dashboard)
7. [Tasks](#7-tasks)
8. [Projects](#8-projects)
9. [Productivity](#9-productivity)
10. [Agent (Desktop App)](#10-agent-desktop-app)
11. [Health Check](#11-health-check)
12. [Error Reference](#12-error-reference)

---

## Auth Header Format

Every protected endpoint requires:

```http
Authorization: Bearer <accessToken>
```

For agent (desktop) endpoints, also include:

```http
x-agent-key: <agentKey>
```

> **Token Storage:** Tokens are also sent/received as `HttpOnly` cookies (`ems_token`, `ems_refresh_token`). Either cookies OR Bearer header work.

---

## User Roles

| Role | Access Level |
|------|-------------|
| `super_admin` | Full access across all tenants |
| `company_admin` | Full access within their company |
| `manager` | Read access to employees, reports |
| `employee` | Own data only |

---

## 1. Authentication

### 1.1 Register Company

Creates a new company (tenant) and its admin account.

```
POST /api/auth/register
```

**Auth required:** No

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "admin@acmecorp.com",
  "password": "SecurePass@123",
  "companyName": "Acme Corporation",
  "phone": "+91 9876543210"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | Admin's full name |
| `email` | string | Yes | Unique — used for login |
| `password` | string | Yes | Min 8 chars |
| `companyName` | string | Yes | Company/tenant name |
| `phone` | string | No | Optional |

**Success Response `201`:**

```json
{
  "success": true,
  "message": "Company registered successfully.",
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "John Doe",
      "email": "admin@acmecorp.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38"
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Acme Corporation",
      "plan": "starter",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

**Error `409`:** Company email already registered.

---

### 1.2 Login

```
POST /api/auth/login
```

**Auth required:** No

**Request Body:**

```json
{
  "email": "admin@acmecorp.com",
  "password": "SecurePass@123",
  "deviceId": "device_1719822000000_abc123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | string | Yes | — |
| `password` | string | Yes | — |
| `deviceId` | string | No | Unique device fingerprint for desktop/mobile |

**Success Response `200`:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "John Doe",
      "email": "admin@acmecorp.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38",
      "department": "Engineering",
      "designation": "CTO",
      "avatar": "https://res.cloudinary.com/...",
      "agentKey": "agent_7x9k2m..."
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Acme Corporation",
      "plan": "starter",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

> Save `accessToken` and `agentKey`. The `agentKey` is required for all desktop agent API calls.

**Errors:**
- `401` — Invalid email or password
- `403` — Account deactivated / Company suspended

---

### 1.3 Get Current User

```
GET /api/auth/me
```

**Auth required:** Yes

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "John Doe",
      "email": "admin@acmecorp.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38",
      "department": "Engineering",
      "designation": "CTO",
      "avatar": "https://res.cloudinary.com/...",
      "phone": "+91 9876543210",
      "employeeId": "EMP-0001",
      "workMode": "office",
      "agentKey": "agent_7x9k2m...",
      "lastActive": "2026-07-01T07:00:00.000Z",
      "isOnline": true
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Acme Corporation",
      "plan": "starter",
      "status": "active",
      "settings": {
        "screenshotInterval": 5,
        "trackApps": true,
        "trackUrls": true,
        "blurScreenshots": false,
        "workStartTime": "09:00",
        "workEndTime": "18:00",
        "idleTimeThreshold": 5
      }
    }
  }
}
```

---

### 1.4 Update Profile

```
PUT /api/auth/profile
```

**Auth required:** Yes

**Request Body** (all fields optional):

```json
{
  "name": "John Smith",
  "phone": "+91 9876543210",
  "department": "Product",
  "designation": "Senior Manager"
}
```

**Success Response `200`:**

```json
{
  "success": true,
  "message": "Profile updated.",
  "data": { "...updated user object..." }
}
```

---

### 1.5 Upload Avatar

```
POST /api/auth/avatar
Content-Type: multipart/form-data
```

**Auth required:** Yes

| Form Field | Type | Notes |
|------------|------|-------|
| `avatar` | file | JPEG/PNG, max 5MB |

**Response `200`:**

```json
{
  "success": true,
  "message": "Avatar uploaded successfully.",
  "data": {
    "avatar": "https://res.cloudinary.com/dlk9snft4/image/upload/ems/avatars/..."
  }
}
```

---

### 1.6 Logout

```
POST /api/auth/logout
```

**Auth required:** Yes — clears `ems_token` and `ems_refresh_token` cookies.

**Response `200`:**

```json
{ "success": true, "message": "Logged out successfully." }
```

---

### 1.7 Refresh Token

```
POST /api/auth/refresh-token
```

**Auth required:** No (reads `ems_refresh_token` cookie automatically)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

---

## 2. Employees

> All endpoints require `company_admin`, `manager`, or `super_admin` role.

### 2.1 List Employees

```
GET /api/employees
```

**Query Params:**

| Param | Type | Example | Notes |
|-------|------|---------|-------|
| `page` | number | `1` | Default 1 |
| `limit` | number | `20` | Default 20 |
| `status` | string | `active` | `active` or `inactive` |
| `department` | string | `Engineering` | Filter by dept |
| `search` | string | `john` | Searches name, email, employeeId |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "_id": "6a435339be609b0c1e1bdd41",
        "name": "Alice Johnson",
        "email": "alice@acmecorp.com",
        "role": "employee",
        "department": "Engineering",
        "designation": "Frontend Developer",
        "employeeId": "EMP-0001",
        "status": "active",
        "isOnline": false,
        "lastActive": "2026-07-01T06:30:00.000Z",
        "workMode": "wfh"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

---

### 2.2 Add Employee

```
POST /api/employees
```

**Role required:** `company_admin`, `super_admin`

**Request Body:**

```json
{
  "name": "Alice Johnson",
  "email": "alice@acmecorp.com",
  "password": "Temp@123456",
  "role": "employee",
  "department": "Engineering",
  "designation": "Frontend Developer",
  "employeeId": "EMP-0042",
  "phone": "+91 9000000001"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | Yes | — |
| `email` | string | Yes | Unique per tenant |
| `password` | string | No | Auto-generated if omitted |
| `role` | string | No | Default: `employee` |
| `department` | string | No | — |
| `designation` | string | No | — |
| `employeeId` | string | No | e.g. `EMP-0042` |
| `phone` | string | No | — |

**Success Response `201`:**

```json
{
  "success": true,
  "message": "Employee added successfully.",
  "data": {
    "id": "6a435339be609b0c1e1bdd44",
    "name": "Alice Johnson",
    "email": "alice@acmecorp.com",
    "role": "employee",
    "department": "Engineering",
    "designation": "Frontend Developer",
    "agentKey": "agent_k8m3x...",
    "tempPassword": "Ax7kP2mNqR8s"
  }
}
```

> `tempPassword` is only returned once when no `password` was provided in the request.

---

### 2.3 Get Single Employee

```
GET /api/employees/:id
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "6a435339be609b0c1e1bdd44",
    "name": "Alice Johnson",
    "email": "alice@acmecorp.com",
    "role": "employee",
    "department": "Engineering",
    "status": "active",
    "workMode": "wfh",
    "isOnline": true,
    "lastActive": "2026-07-01T07:15:00.000Z"
  }
}
```

---

### 2.4 Update Employee

```
PUT /api/employees/:id
```

**Role required:** `company_admin`, `super_admin`

**Request Body** (all optional):

```json
{
  "name": "Alice Smith",
  "department": "Product",
  "designation": "Senior Developer",
  "status": "inactive",
  "workMode": "office",
  "phone": "+91 9000000002"
}
```

Allowed fields: `name`, `department`, `designation`, `phone`, `status`, `role`, `employeeId`, `workMode`

**Response `200`:**

```json
{
  "success": true,
  "message": "Employee updated.",
  "data": { "...updated employee..." }
}
```

---

### 2.5 Delete (Deactivate) Employee

```
DELETE /api/employees/:id
```

> Sets `status: "inactive"` — does NOT permanently delete data.

**Response `200`:**

```json
{ "success": true, "message": "Employee deactivated." }
```

---

### 2.6 Regenerate Agent Key

```
POST /api/employees/:id/regenerate-key
```

**Role required:** `company_admin`, `super_admin`

**Response `200`:**

```json
{
  "success": true,
  "message": "Agent key regenerated.",
  "data": { "agentKey": "agent_newkey_xyz..." }
}
```

---

## 3. Attendance

### 3.1 Punch In

```
POST /api/attendance/punch-in
```

**Auth required:** Yes

**Request Body:**

```json
{
  "workMode": "wfh",
  "ip": "192.168.1.100",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "New Delhi, India",
    "accuracy": 10
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `workMode` | string | No | `office`, `wfh`, or `field` |
| `ip` | string | No | Client IP |
| `location` | object | No | GPS coordinates |

**Success Response `201`:**

```json
{
  "success": true,
  "message": "Punched in successfully.",
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "userId": "6a435339be609b0c1e1bdd44",
    "date": "2026-07-01",
    "status": "present",
    "workMode": "wfh",
    "punchIn": {
      "time": "2026-07-01T03:30:00.000Z",
      "ip": "192.168.1.100",
      "method": "web",
      "isInsideGeofence": false
    },
    "breaks": [],
    "totalWorkMinutes": 0
  }
}
```

**Error `400`:** Already punched in today.

---

### 3.2 Punch Out

```
POST /api/attendance/punch-out
```

**Request Body:**

```json
{ "ip": "192.168.1.100" }
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Punched out successfully.",
  "data": {
    "punchOut": { "time": "2026-07-01T11:30:00.000Z", "method": "web" },
    "totalWorkMinutes": 480,
    "totalBreakMinutes": 0,
    "overtimeMinutes": 0
  }
}
```

---

### 3.3 Start Break

```
POST /api/attendance/break/start
```

**Request Body:**

```json
{ "reason": "Lunch" }
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Break started.",
  "data": { "...attendance record..." }
}
```

**Errors:**
- `400` — Must be punched in / Already on a break
- `404` — No attendance record today

---

### 3.4 End Break

```
POST /api/attendance/break/end
```

**Body:** None

**Response `200`:**

```json
{
  "success": true,
  "message": "Break ended.",
  "data": { "...attendance record with break duration..." }
}
```

---

### 3.5 Get Today's Attendance

```
GET /api/attendance/today
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "date": "2026-07-01",
    "status": "present",
    "workMode": "wfh",
    "punchIn": { "time": "2026-07-01T03:30:00.000Z" },
    "punchOut": null,
    "breaks": [
      {
        "startTime": "2026-07-01T07:00:00.000Z",
        "endTime": "2026-07-01T07:45:00.000Z",
        "duration": 45,
        "reason": "Lunch"
      }
    ],
    "totalWorkMinutes": 0,
    "totalBreakMinutes": 45,
    "idleMinutes": 12
  }
}
```

> Returns `null` if no punch-in today.

---

### 3.6 Attendance History

```
GET /api/attendance/history
```

**Query Params:**

| Param | Type | Notes |
|-------|------|-------|
| `page` | number | Default 1 |
| `limit` | number | Default 30 |
| `startDate` | ISO date | `2026-07-01` |
| `endDate` | ISO date | `2026-07-31` |
| `userId` | ObjectId | Admin only |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "attendance": [
      {
        "date": "2026-07-01",
        "status": "present",
        "totalWorkMinutes": 472,
        "totalBreakMinutes": 45,
        "punchIn": { "time": "2026-07-01T03:30:00.000Z" },
        "punchOut": { "time": "2026-07-01T11:30:00.000Z" }
      }
    ],
    "pagination": { "total": 22, "page": 1, "limit": 30, "pages": 1 }
  }
}
```

---

### 3.7 Attendance Report (Admin)

```
GET /api/attendance/report
```

**Role required:** `company_admin`, `manager`, `super_admin`

**Query Params:** `startDate`, `endDate`, `userId` (optional), `department` (optional)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "report": [
      {
        "employee": { "name": "Alice Johnson", "email": "alice@acmecorp.com", "employeeId": "EMP-0042" },
        "totalDays": 22,
        "presentDays": 20,
        "absentDays": 2,
        "lateDays": 1,
        "totalWorkMinutes": 9440,
        "avgWorkMinutesPerDay": 472
      }
    ]
  }
}
```

---

## 4. Activity Logs

### 4.1 Log Activities

```
POST /api/activity/log
```

**Auth required:** Yes

**Request Body:**

```json
{
  "activities": [
    {
      "appName": "Visual Studio Code",
      "windowTitle": "App.tsx - my-project",
      "url": "",
      "startTime": "2026-07-01T04:00:00.000Z",
      "endTime": "2026-07-01T04:05:00.000Z",
      "durationMinutes": 5,
      "category": "productive"
    },
    {
      "appName": "Google Chrome",
      "windowTitle": "YouTube - Music",
      "url": "https://youtube.com",
      "startTime": "2026-07-01T04:05:00.000Z",
      "endTime": "2026-07-01T04:12:00.000Z",
      "durationMinutes": 7,
      "category": "unproductive"
    }
  ]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `activities` | array | Yes | Min 1 item |
| `appName` | string | Yes | Active application name |
| `windowTitle` | string | No | Window title |
| `url` | string | No | Browser URL |
| `startTime` | ISO datetime | Yes | — |
| `endTime` | ISO datetime | No | — |
| `durationMinutes` | number | No | — |
| `category` | string | No | `productive`, `neutral`, or `unproductive` |

**Response `201`:**

```json
{
  "success": true,
  "message": "2 activities logged.",
  "data": { "count": 2 }
}
```

---

### 4.2 Get Activity Logs

```
GET /api/activity
```

**Query Params:**

| Param | Type | Notes |
|-------|------|-------|
| `page` | number | Default 1 |
| `limit` | number | Default 50 |
| `userId` | ObjectId | Admin only |
| `startDate` | ISO date | Filter start |
| `endDate` | ISO date | Filter end |
| `category` | string | `productive`, `neutral`, `unproductive` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "6a450000be609b0c1e1bdd99",
        "userId": {
          "_id": "6a435339be609b0c1e1bdd44",
          "name": "Alice Johnson",
          "email": "alice@acmecorp.com",
          "employeeId": "EMP-0042"
        },
        "appName": "Visual Studio Code",
        "windowTitle": "App.tsx",
        "startTime": "2026-07-01T04:00:00.000Z",
        "durationMinutes": 5,
        "category": "productive"
      }
    ],
    "pagination": { "total": 320, "page": 1, "limit": 50, "pages": 7 }
  }
}
```

---

### 4.3 Activity Summary

```
GET /api/activity/summary
```

**Query Params:** `userId`, `startDate`, `endDate` (same as above)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "summary": [
      { "_id": "productive", "totalMinutes": 312, "count": 64 },
      { "_id": "neutral", "totalMinutes": 88, "count": 18 },
      { "_id": "unproductive", "totalMinutes": 40, "count": 9 }
    ],
    "topApps": [
      { "_id": "Visual Studio Code", "totalMinutes": 280, "count": 57, "category": "productive" },
      { "_id": "Google Chrome", "totalMinutes": 120, "count": 24, "category": "neutral" },
      { "_id": "YouTube", "totalMinutes": 35, "count": 7, "category": "unproductive" }
    ]
  }
}
```

---

## 5. Screenshots

### 5.1 Upload Screenshot

```
POST /api/screenshots/upload
Content-Type: multipart/form-data
```

**Auth required:** Yes

| Form Field | Type | Required | Notes |
|------------|------|----------|-------|
| `screenshot` | file | Yes | JPEG/PNG, max 10MB — auto-compressed to 1280x720 |
| `activeApp` | string | No | App at capture time |
| `windowTitle` | string | No | Window title at capture time |

**Response `201`:**

```json
{
  "success": true,
  "message": "Screenshot uploaded to Cloudinary.",
  "data": {
    "_id": "6a460000be609b0c1e1bddaa",
    "imageUrl": "https://res.cloudinary.com/dlk9snft4/image/upload/ems/screenshots/...",
    "thumbnailUrl": "https://res.cloudinary.com/dlk9snft4/image/upload/w_300,h_200,c_fit/...",
    "timestamp": "2026-07-01T07:30:00.000Z",
    "activeApp": "Visual Studio Code",
    "productivityTag": "productive",
    "metadata": {
      "fileSize": 245760,
      "format": "jpg",
      "uploadedToCloud": true
    }
  }
}
```

---

### 5.2 List Screenshots

```
GET /api/screenshots
```

**Query Params:** `page`, `limit`, `userId`, `startDate`, `endDate`, `productivityTag`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "screenshots": [
      {
        "_id": "6a460000be609b0c1e1bddaa",
        "userId": { "_id": "...", "name": "Alice Johnson", "email": "alice@acmecorp.com" },
        "imageUrl": "https://res.cloudinary.com/...",
        "thumbnailUrl": "https://res.cloudinary.com/.../w_300,h_200,c_fit/...",
        "timestamp": "2026-07-01T07:30:00.000Z",
        "activeApp": "Visual Studio Code",
        "productivityTag": "productive"
      }
    ],
    "pagination": { "total": 156, "page": 1, "limit": 20, "pages": 8 }
  }
}
```

---

### 5.3 Get Single Screenshot

```
GET /api/screenshots/:id
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "_id": "6a460000be609b0c1e1bddaa",
    "imageUrl": "https://res.cloudinary.com/...",
    "thumbnailUrl": "https://res.cloudinary.com/...",
    "timestamp": "2026-07-01T07:30:00.000Z",
    "activeApp": "Visual Studio Code",
    "metadata": { "fileSize": 245760, "format": "jpg", "uploadedToCloud": true }
  }
}
```

---

### 5.4 Delete Screenshot

```
DELETE /api/screenshots/:id
```

**Role required:** `company_admin`, `super_admin`

**Response `200`:**

```json
{ "success": true, "message": "Screenshot deleted." }
```

---

## 6. Dashboard

### 6.1 Admin Dashboard

```
GET /api/dashboard/admin
```

**Role required:** `company_admin`, `manager`, `super_admin`

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalEmployees": 42,
      "activeEmployees": 38,
      "todayPresent": 31,
      "todayLate": 3,
      "todayAbsent": 2,
      "notMarked": 2,
      "todayScreenshots": 156,
      "onlineNow": 24
    },
    "attendanceStats": [
      { "_id": "present", "count": 31 },
      { "_id": "late", "count": 3 },
      { "_id": "absent", "count": 2 }
    ],
    "attendanceTrend": [
      { "date": "2026-06-25", "present": 28 },
      { "date": "2026-06-26", "present": 30 },
      { "date": "2026-06-27", "present": 0 },
      { "date": "2026-06-28", "present": 0 },
      { "date": "2026-06-29", "present": 27 },
      { "date": "2026-06-30", "present": 29 },
      { "date": "2026-07-01", "present": 31 }
    ],
    "productivityBreakdown": [
      { "_id": "productive", "totalMinutes": 14880 },
      { "_id": "neutral", "totalMinutes": 4320 },
      { "_id": "unproductive", "totalMinutes": 960 }
    ],
    "recentScreenshots": [
      {
        "_id": "6a460000be609b0c1e1bddaa",
        "userId": { "name": "Alice Johnson", "email": "alice@acmecorp.com" },
        "thumbnailUrl": "https://res.cloudinary.com/...",
        "timestamp": "2026-07-01T07:30:00.000Z",
        "activeApp": "Visual Studio Code"
      }
    ]
  }
}
```

---

### 6.2 Employee Dashboard

```
GET /api/dashboard/employee
```

**Auth required:** Yes (any role)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "todayAttendance": {
      "date": "2026-07-01",
      "status": "present",
      "punchIn": { "time": "2026-07-01T03:30:00.000Z" },
      "punchOut": null,
      "totalWorkMinutes": 0,
      "breaks": []
    },
    "todayScreenshots": 12,
    "recentActivity": [
      {
        "appName": "Visual Studio Code",
        "windowTitle": "App.tsx",
        "durationMinutes": 25,
        "category": "productive",
        "startTime": "2026-07-01T07:00:00.000Z"
      }
    ],
    "weekAttendance": [
      { "date": "2026-06-30", "status": "present", "totalWorkMinutes": 475 },
      { "date": "2026-06-29", "status": "present", "totalWorkMinutes": 462 }
    ],
    "productivityToday": [
      { "_id": "productive", "totalMinutes": 312 },
      { "_id": "neutral", "totalMinutes": 68 }
    ]
  }
}
```

---

## 7. Tasks

### 7.1 List Tasks

```
GET /api/tasks
```

**Auth required:** Yes (employees see own tasks only)

**Query Params:**

| Param | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Admin only |
| `done` | boolean | `true` or `false` |

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a470000be609b0c1e1bddbb",
      "title": "Design dashboard UI",
      "deadline": "22 May 2025",
      "done": false,
      "userId": "6a435339be609b0c1e1bdd44",
      "createdAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

> If no tasks exist, 5 default seed tasks are auto-created.

---

### 7.2 Create Task

```
POST /api/tasks
```

**Request Body:**

```json
{
  "title": "Write API documentation",
  "deadline": "10 Jul 2026",
  "userId": "6a435339be609b0c1e1bdd44"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | Yes | — |
| `deadline` | string | No | Human-readable, e.g. `"10 Jul 2026"` |
| `userId` | ObjectId | No | Admin can assign to others |

**Response `201`:**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "6a470001be609b0c1e1bddbc",
    "title": "Write API documentation",
    "deadline": "10 Jul 2026",
    "done": false
  }
}
```

---

### 7.3 Update Task

```
PUT /api/tasks/:id
```

**Request Body** (all optional):

```json
{
  "title": "Write API documentation (updated)",
  "deadline": "15 Jul 2026",
  "done": true
}
```

**Response `200`:**

```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": { "...updated task..." }
}
```

---

## 8. Projects

### 8.1 List Projects

```
GET /api/projects
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a480000be609b0c1e1bddcc",
      "name": "EMS Frontend v2",
      "description": "Redesign the admin portal",
      "status": "active",
      "startDate": "2026-06-01",
      "endDate": "2026-08-31"
    }
  ]
}
```

---

### 8.2 Create Project

```
POST /api/projects
```

**Role required:** `company_admin`, `manager`, `super_admin`

**Request Body:**

```json
{
  "name": "EMS Frontend v2",
  "description": "Redesign the admin portal",
  "status": "active",
  "startDate": "2026-06-01",
  "endDate": "2026-08-31",
  "budget": 50000
}
```

---

### 8.3 Update Project

```
PUT /api/projects/:id
```

Any project fields in request body.

---

### 8.4 Get Project Time Entries

```
GET /api/projects/:id/time-entries
```

**Response `200`:**

```json
{
  "success": true,
  "data": [
    {
      "userId": "6a435339be609b0c1e1bdd44",
      "date": "2026-07-01",
      "minutes": 120,
      "notes": "Implemented login page"
    }
  ]
}
```

---

### 8.5 Add Time Entry

```
POST /api/projects/:id/time-entries
```

**Request Body:**

```json
{
  "date": "2026-07-01",
  "minutes": 120,
  "notes": "Implemented login page"
}
```

---

## 9. Productivity

> NEW endpoints added in Day 1 setup.

### 9.1 Daily Productivity Stats

```
GET /api/productivity/stats
```

**Auth required:** Yes

**Query Params:**

| Param | Type | Notes |
|-------|------|-------|
| `date` | ISO date | Default: today |
| `userId` | ObjectId | Admin only |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "date": "2026-07-01",
    "stats": {
      "productive": 18720,
      "neutral": 5040,
      "unproductive": 2400,
      "total": 26160,
      "productivePercent": 72,
      "neutralPercent": 19,
      "unproductivePercent": 9
    },
    "topApps": [
      { "_id": "Visual Studio Code", "totalMinutes": 312, "count": 64 },
      { "_id": "Figma", "totalMinutes": 78, "count": 16 }
    ],
    "topWebsites": [
      { "_id": "github.com", "totalMinutes": 45, "count": 9 }
    ]
  }
}
```

> Values (`productive`, `neutral`, `unproductive`, `total`) are in **seconds**.

---

### 9.2 Date Range Productivity Stats

```
GET /api/productivity/range
```

**Query Params:**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `startDate` | ISO date | Yes | `2026-07-01` |
| `endDate` | ISO date | Yes | `2026-07-07` |
| `userId` | ObjectId | No | Admin only |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "startDate": "2026-07-01T00:00:00.000Z",
    "endDate": "2026-07-07T23:59:59.999Z",
    "stats": {
      "productive": 131040,
      "neutral": 35280,
      "unproductive": 16800,
      "total": 183120,
      "productivePercent": 72,
      "neutralPercent": 19,
      "unproductivePercent": 9
    }
  }
}
```

---

### 9.3 List Productivity Keywords

```
GET /api/productivity/keywords
```

**Role required:** `company_admin`, `manager`, `super_admin`

**Query Params:** `category` (`productive`, `neutral`, `unproductive`)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "keywords": [
      {
        "_id": "6a490000be609b0c1e1bdddd",
        "keyword": "vs code",
        "category": "productive",
        "type": "app",
        "matchType": "contains",
        "priority": 9,
        "enabled": true
      },
      {
        "_id": "6a490001be609b0c1e1bddde",
        "keyword": "youtube.com",
        "category": "unproductive",
        "type": "url",
        "matchType": "contains",
        "priority": 10,
        "enabled": true
      }
    ],
    "count": 75
  }
}
```

---

### 9.4 Create Keyword

```
POST /api/productivity/keywords
```

**Role required:** `company_admin`, `super_admin`

**Request Body:**

```json
{
  "keyword": "notion.so",
  "category": "productive",
  "type": "url",
  "matchType": "contains",
  "priority": 7
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `keyword` | string | Yes | Auto-lowercased |
| `category` | string | Yes | `productive`, `neutral`, `unproductive` |
| `type` | string | Yes | `app`, `url`, `window_title` |
| `matchType` | string | No | `exact`, `contains`, `regex` (default: `contains`) |
| `priority` | number | No | 1-10, higher = evaluated first (default: 5) |

**Response `201`:**

```json
{
  "success": true,
  "message": "Keyword created",
  "data": { "...created keyword..." }
}
```

---

### 9.5 Update Keyword

```
PUT /api/productivity/keywords/:id
```

**Request Body** (any keyword fields):

```json
{
  "priority": 9,
  "enabled": false
}
```

---

### 9.6 Delete Keyword

```
DELETE /api/productivity/keywords/:id
```

**Response `200`:**

```json
{ "success": true, "message": "Keyword deleted" }
```

---

## 10. Agent (Desktop App)

> All agent endpoints require **both** headers:
>
> ```
> Authorization: Bearer <accessToken>
> x-agent-key: <agentKey>
> ```

---

### 10.1 Heartbeat

```
POST /api/agent/heartbeat
```

Updates `lastActive` and `isOnline: true`. Call every 30 seconds.

**Request Body:**

```json
{
  "status": "working",
  "version": "1.2.0",
  "internet": true,
  "battery": 87
}
```

| Field | Type | Notes |
|-------|------|-------|
| `status` | string | `working` or `idle` |
| `version` | string | Agent version string |
| `internet` | boolean | Internet availability |
| `battery` | number | Battery % (0-100) |

**Response `200`:**

```json
{ "success": true, "message": "Heartbeat received." }
```

---

### 10.2 Upload Screenshot (Agent)

```
POST /api/agent/screenshot
Content-Type: multipart/form-data
```

| Form Field | Type | Notes |
|------------|------|-------|
| `screenshot` | file | JPEG/PNG |
| `activeApp` | string | Active application |
| `windowTitle` | string | Window title |

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "6a460000be609b0c1e1bddaa",
    "imageUrl": "https://res.cloudinary.com/...",
    "thumbnailUrl": "https://res.cloudinary.com/.../w_300,h_200,c_fit/...",
    "productivityTag": "productive"
  }
}
```

---

### 10.3 Log Activity (Agent)

```
POST /api/agent/activity
```

**Request Body:**

```json
{
  "activities": [
    {
      "appName": "Visual Studio Code",
      "windowTitle": "App.tsx - ems-frontend",
      "url": "",
      "startTime": "2026-07-01T04:00:00.000Z",
      "endTime": "2026-07-01T04:05:00.000Z",
      "durationMinutes": 5
    }
  ]
}
```

**Response `201`:**

```json
{ "success": true, "message": "Activities logged." }
```

---

### 10.4 Sync (Bulk Activities + Idle Time)

```
POST /api/agent/sync
```

Use for bulk-syncing accumulated offline activities and idle time. Call every 30 seconds.

**Request Body:**

```json
{
  "activities": [
    {
      "appName": "Visual Studio Code",
      "windowTitle": "Dashboard.tsx",
      "url": "",
      "startTime": "2026-07-01T04:00:00.000Z",
      "endTime": "2026-07-01T04:05:00.000Z",
      "durationMinutes": 5
    }
  ],
  "idleTimeMinutes": 12
}
```

| Field | Type | Notes |
|-------|------|-------|
| `activities` | array | Can be empty `[]` |
| `idleTimeMinutes` | number | Accumulated idle since last sync |

**Response `200`:**

```json
{ "success": true, "message": "Sync complete." }
```

---

### 10.5 Agent Punch In

```
POST /api/agent/punch-in
```

**Request Body:**

```json
{ "ip": "192.168.1.100" }
```

**Response `201`:**

```json
{ "success": true, "data": { "...attendance record..." } }
```

---

### 10.6 Agent Punch Out

```
POST /api/agent/punch-out
```

**Request Body:**

```json
{ "ip": "192.168.1.100" }
```

**Response `200`:**

```json
{ "success": true, "data": { "...attendance record with totalWorkMinutes..." } }
```

---

### 10.7 Get Agent Status

```
GET /api/agent/status
```

Returns today's punch state for the current user.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "isPunchedIn": true,
    "punchInTime": "2026-07-01T03:30:00.000Z",
    "totalWorkMinutes": 240
  }
}
```

---

### 10.8 Get Agent Config

```
GET /api/agent/config
```

Returns tenant monitoring settings for the desktop agent.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "screenshotInterval": 5,
    "trackApps": true,
    "trackUrls": true,
    "blurScreenshots": false,
    "workStartTime": "09:00",
    "workEndTime": "18:00",
    "idleTimeThreshold": 5,
    "autoStopTracking": false
  }
}
```

---

## 11. Health Check

```
GET /api/health
```

**Auth required:** No. Use to verify backend is running before starting the app.

**Response `200`:**

```json
{
  "success": true,
  "message": "Employee Monitoring System API is running",
  "timestamp": "2026-07-01T07:00:00.000Z"
}
```

---

## 12. Error Reference

### Standard Error Shape

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

`errors` array only appears on `400` validation errors.

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `200` | OK | Request succeeded |
| `201` | Created | Resource created |
| `400` | Bad Request | Missing/invalid fields, duplicate punch-in |
| `401` | Unauthorized | No token, expired token, wrong password |
| `403` | Forbidden | Insufficient role / suspended account |
| `404` | Not Found | ID does not exist |
| `409` | Conflict | Email already exists |
| `429` | Too Many Requests | Rate limit hit |
| `500` | Server Error | Unexpected backend error |

### Rate Limits

| Route | Limit |
|-------|-------|
| `POST /auth/login` | 5 requests / 15 min |
| `POST /auth/register` | 5 requests / 15 min |
| `POST /auth/refresh-token` | 30 requests / 15 min |
| `POST /agent/screenshot` | 10 requests / 1 min |
| All other routes | 10,000 / 15 min (dev) |

---

## Quick Start — JavaScript Example

```javascript
const BASE = 'http://localhost:5000/api';

// 1. Login
const { data } = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email: 'admin@democompany.com', password: 'Demo@123456' })
}).then(r => r.json());

const token = data.accessToken;

// 2. Authenticated GET
const dashboard = await fetch(`${BASE}/dashboard/admin`, {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json());

console.log(dashboard.data.stats);

// 3. Pagination
const employees = await fetch(
  `${BASE}/employees?page=1&limit=10&department=Engineering`,
  { headers: { Authorization: `Bearer ${token}` } }
).then(r => r.json());
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@employeemonitor.com` | `Admin@123456` |
| Company Admin | `admin@democompany.com` | `Demo@123456` |
| Employee 1-5 | `emp1@democompany.com` | `Emp@123456` |

---

*EMS Backend v1.0.0 — API Reference generated July 1, 2026*
