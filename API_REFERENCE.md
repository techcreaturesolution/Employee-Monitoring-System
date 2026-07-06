# Employee Monitoring System (EMS) — Frontend API Reference & Guide

This document is the comprehensive API reference for the Employee Monitoring System (EMS) frontend developers (Web Admin Portal, Mobile App, and Desktop Agent App).

- **Base URL (Development):** `http://localhost:5000/api`
- **Base URL (Production):** `https://ems-backend-tcs.onrender.com/api` (or configured production URL)
- **Content-Type:** `application/json` (unless uploading multipart files)
- **Authentication:** JWT Bearer Token in `Authorization` header

---

## Table of Contents
1. [Global Configuration & Authentication](#1-global-configuration--authentication)
2. [Authentication & Profile Endpoints](#2-authentication--profile-endpoints)
3. [Employee Management Endpoints](#3-employee-management-endpoints)
4. [Attendance & Breaks Endpoints](#4-attendance--breaks-endpoints)
5. [Leave Application Endpoints](#5-leave-application-endpoints)
6. [Screenshots Endpoints](#6-screenshots-endpoints)
7. [Activity Logs Endpoints](#7-activity-logs-endpoints)
8. [Productivity Stats & Keywords Endpoints](#8-productivity-stats--keywords-endpoints)
9. [Projects & Time Entries Endpoints](#9-projects--time-entries-endpoints)
10. [Tasks Endpoints](#10-tasks-endpoints)
11. [Dashboard Summary Endpoints](#11-dashboard-summary-endpoints)
12. [Location & Geofencing Endpoints](#12-location--geofencing-endpoints)
13. [Mobile App Specific Endpoints](#13-mobile-app-specific-endpoints)
14. [Notification Endpoints](#14-notification-endpoints)
15. [Report compilation & Export Endpoints](#15-report-compilation--export-endpoints)
16. [Company Settings Endpoints](#16-company-settings-endpoints)
17. [Tenant Management Endpoints (Super Admin Only)](#17-tenant-management-endpoints-super-admin-only)
18. [Agent (Desktop App) Endpoints](#18-agent-desktop-app-endpoints)
19. [Real-time Socket.io Events](#19-real-time-socketio-events)
20. [Error Codes & Reference](#20-error-codes--reference)

---

## 1. Global Configuration & Authentication

### 1.1 Auth Header Format
For protected endpoints, include the access token in the headers:
```http
Authorization: Bearer <accessToken>
```

For desktop-agent endpoints, authenticate using:
```http
x-agent-key: <agentKey>
```

> **Token Storage:** Tokens are sent/received in the headers and also optionally set as `HttpOnly` cookies (`ems_token`, `ems_refresh_token`).

### 1.2 User Roles & Access Matrix
| Role | Description | Access Level |
|---|---|---|
| `super_admin` | Global platform administrator | Can manage all tenants, plans, and platform settings. |
| `company_admin` | Tenant/Company administrator | Full control over company settings, employees, projects, and reporting. |
| `manager` | Department/Team manager | Can read reports, verify activity logs, view live locations, and approve leaves/tasks. |
| `employee` | Regular staff member | Can view their own logs, log breaks, apply for leaves, and track mobile locations. |

---

## 2. Authentication & Profile Endpoints

### 2.1 Register Company & Admin
Creates a new tenant and its initial administrator account.
- **Method:** `POST`
- **Path:** `/auth/register`
- **Authentication Required:** No
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "admin@enterprise.com",
  "password": "StrongPassword123!",
  "companyName": "Enterprise Solutions Ltd",
  "phone": "+91 9999988888"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Company registered successfully.",
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "Jane Doe",
      "email": "admin@enterprise.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38"
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Enterprise Solutions Ltd",
      "plan": "starter",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

### 2.2 Login
Authenticates users for Web Admin Portal or Mobile App.
- **Method:** `POST`
- **Path:** `/auth/login`
- **Authentication Required:** No
- **Request Body:**
```json
{
  "email": "admin@enterprise.com",
  "password": "StrongPassword123!",
  "deviceId": "device_fingerprint_abc123"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "Jane Doe",
      "email": "admin@enterprise.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38",
      "department": "Executive",
      "designation": "CEO",
      "avatar": "https://res.cloudinary.com/...",
      "agentKey": "agent_7x9k2m..."
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Enterprise Solutions Ltd",
      "plan": "starter",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

### 2.3 Get Current User Profile
Retrieves the profile information of the authenticated user.
- **Method:** `GET`
- **Path:** `/auth/me`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6a435338be609b0c1e1bdd39",
      "name": "Jane Doe",
      "email": "admin@enterprise.com",
      "role": "company_admin",
      "tenantId": "6a435338be609b0c1e1bdd38",
      "department": "Executive",
      "designation": "CEO",
      "phone": "+91 9999988888",
      "avatar": "https://res.cloudinary.com/...",
      "workMode": "office",
      "agentKey": "agent_7x9k2m...",
      "isOnline": true
    }
  }
}
```

### 2.4 Update Profile
Allows users to modify their personal profile details.
- **Method:** `PUT`
- **Path:** `/auth/profile`
- **Authentication Required:** Yes
- **Request Body (All fields optional):**
```json
{
  "name": "Jane Smith",
  "phone": "+91 9876543210",
  "department": "Management",
  "designation": "Managing Director"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated.",
  "data": {
    "id": "6a435338be609b0c1e1bdd39",
    "name": "Jane Smith",
    "email": "admin@enterprise.com",
    "role": "company_admin",
    "tenantId": "6a435338be609b0c1e1bdd38",
    "department": "Management",
    "designation": "Managing Director",
    "phone": "+91 9876543210"
  }
}
```

### 2.5 Change Password
- **Method:** `PUT`
- **Path:** `/auth/change-password`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

### 2.6 Upload Avatar
- **Method:** `POST`
- **Path:** `/auth/avatar`
- **Authentication Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `avatar`: File (JPG, PNG, max 5MB)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully.",
  "data": {
    "avatar": "https://res.cloudinary.com/ems-bucket/image/upload/v1234/avatars/6a43.png"
  }
}
```

### 2.7 Logout
Clears authentication cookies and invalidates the session.
- **Method:** `POST`
- **Path:** `/auth/logout`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

### 2.8 Refresh Token
Generates a new access token. Requires the `ems_refresh_token` cookie to be present.
- **Method:** `POST`
- **Path:** `/auth/refresh-token`
- **Authentication Required:** No
- **Success Response (200 OK):**
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

## 3. Employee Management Endpoints

### 3.1 List Employees
Retrieves a paginated list of employees for the tenant.
- **Method:** `GET`
- **Path:** `/employees`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `status` (string: `active`, `inactive`)
  - `department` (string)
  - `search` (string: matches name, email, employeeId)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "_id": "6a435339be609b0c1e1bdd41",
        "name": "Alice Johnson",
        "email": "alice@company.com",
        "role": "employee",
        "department": "Engineering",
        "designation": "Frontend Engineer",
        "employeeId": "EMP-0012",
        "status": "active",
        "isOnline": false,
        "lastActive": "2026-07-06T10:00:00.000Z",
        "workMode": "wfh"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

### 3.2 Add Employee
Creates a new employee account in the company.
- **Method:** `POST`
- **Path:** `/employees`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Request Body:**
```json
{
  "name": "Bob Smith",
  "email": "bob@company.com",
  "password": "InitialPassword123!",
  "role": "employee",
  "department": "Marketing",
  "designation": "Social Media Manager",
  "employeeId": "EMP-0015",
  "phone": "+91 9111122222"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Employee added successfully.",
  "data": {
    "id": "6a435339be609b0c1e1bdd44",
    "name": "Bob Smith",
    "email": "bob@company.com",
    "role": "employee",
    "department": "Marketing",
    "designation": "Social Media Manager",
    "agentKey": "agent_bob_key_xyz123",
    "tempPassword": "InitialPassword123!"
  }
}
```

### 3.3 Get Single Employee Detail
- **Method:** `GET`
- **Path:** `/employees/:id`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6a435339be609b0c1e1bdd44",
    "name": "Bob Smith",
    "email": "bob@company.com",
    "role": "employee",
    "department": "Marketing",
    "designation": "Social Media Manager",
    "employeeId": "EMP-0015",
    "phone": "+91 9111122222",
    "status": "active",
    "workMode": "office",
    "isOnline": false,
    "lastActive": null
  }
}
```

### 3.4 Update Employee
- **Method:** `PUT`
- **Path:** `/employees/:id`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Request Body (All fields optional):**
```json
{
  "name": "Robert Smith",
  "department": "Marketing & PR",
  "designation": "Marketing Director",
  "status": "active",
  "workMode": "wfh"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Employee updated.",
  "data": {
    "_id": "6a435339be609b0c1e1bdd44",
    "name": "Robert Smith",
    "email": "bob@company.com",
    "role": "employee",
    "department": "Marketing & PR",
    "designation": "Marketing Director",
    "status": "active",
    "workMode": "wfh"
  }
}
```

### 3.5 Deactivate Employee
Sets employee status to `inactive` (data is preserved).
- **Method:** `DELETE`
- **Path:** `/employees/:id`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Employee deactivated."
}
```

### 3.6 Regenerate Desktop Agent Key
Generates a new key required for the desktop app configuration.
- **Method:** `POST`
- **Path:** `/employees/:id/regenerate-key`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Agent key regenerated.",
  "data": {
    "agentKey": "agent_new_key_string_abc123"
  }
}
```

---

## 4. Attendance & Breaks Endpoints

### 4.1 Punch In
Records daily start of work.
- **Method:** `POST`
- **Path:** `/attendance/punch-in`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "workMode": "wfh",
  "ip": "192.168.1.10",
  "location": {
    "latitude": 28.5355,
    "longitude": 77.3910,
    "address": "Sector 62, Noida, UP, India",
    "accuracy": 15
  },
  "screenshotUrl": "",
  "method": "web"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Punched in successfully.",
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "userId": "6a435339be609b0c1e1bdd44",
    "date": "2026-07-06",
    "status": "present",
    "workMode": "wfh",
    "punchIn": {
      "time": "2026-07-06T09:15:00.000Z",
      "ip": "192.168.1.10",
      "method": "web",
      "isInsideGeofence": false
    },
    "breaks": [],
    "totalWorkMinutes": 0,
    "totalBreakMinutes": 0
  }
}
```

### 4.2 Punch Out
Records daily end of work.
- **Method:** `POST`
- **Path:** `/attendance/punch-out`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "ip": "192.168.1.10",
  "location": {
    "latitude": 28.5355,
    "longitude": 77.3910,
    "address": "Sector 62, Noida, UP, India"
  },
  "method": "web"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Punched out successfully.",
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "userId": "6a435339be609b0c1e1bdd44",
    "date": "2026-07-06",
    "status": "present",
    "punchIn": {
      "time": "2026-07-06T09:15:00.000Z"
    },
    "punchOut": {
      "time": "2026-07-06T18:15:00.000Z",
      "ip": "192.168.1.10",
      "method": "web"
    },
    "totalWorkMinutes": 540,
    "totalBreakMinutes": 0,
    "overtimeMinutes": 60
  }
}
```

### 4.3 Start Break
Puts the employee on an active break.
- **Method:** `POST`
- **Path:** `/attendance/break/start`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "reason": "Lunch Break"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Break started.",
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "breaks": [
      {
        "startTime": "2026-07-06T13:00:00.000Z",
        "reason": "Lunch Break",
        "duration": 0
      }
    ]
  }
}
```

### 4.4 End Break
Resumes work from break.
- **Method:** `POST`
- **Path:** `/attendance/break/end`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Break ended.",
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "breaks": [
      {
        "startTime": "2026-07-06T13:00:00.000Z",
        "endTime": "2026-07-06T13:45:00.000Z",
        "duration": 45,
        "reason": "Lunch Break"
      }
    ],
    "totalBreakMinutes": 45
  }
}
```

### 4.5 Get Today's Attendance
Retrieves today's status of the logged-in user.
- **Method:** `GET`
- **Path:** `/attendance/today`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6a440000be609b0c1e1bdd90",
    "userId": "6a435339be609b0c1e1bdd44",
    "date": "2026-07-06",
    "status": "present",
    "workMode": "wfh",
    "punchIn": {
      "time": "2026-07-06T09:15:00.000Z"
    },
    "breaks": [],
    "totalWorkMinutes": 120,
    "totalBreakMinutes": 0
  }
}
```

### 4.6 Get Attendance History
Fetches a list of historical attendance logs.
- **Method:** `GET`
- **Path:** `/attendance/history`
- **Authentication Required:** Yes (Accesses own history for employee; filtered for admins/managers)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 30)
  - `startDate` (string, `YYYY-MM-DD`)
  - `endDate` (string, `YYYY-MM-DD`)
  - `userId` (string, filters records by user, admin only)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "6a440000be609b0c1e1bdd90",
        "userId": {
          "_id": "6a435339be609b0c1e1bdd44",
          "name": "Bob Smith",
          "email": "bob@company.com"
        },
        "date": "2026-07-06",
        "status": "present",
        "workMode": "office",
        "punchIn": { "time": "2026-07-06T09:00:00.000Z" },
        "punchOut": { "time": "2026-07-06T18:00:00.000Z" },
        "totalWorkMinutes": 480,
        "totalBreakMinutes": 60
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 30,
      "pages": 1
    }
  }
}
```

### 4.7 Get Attendance Report
Aggregated attendance metrics for supervisors.
- **Method:** `GET`
- **Path:** `/attendance/report`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Query Parameters:**
  - `startDate` (string, `YYYY-MM-DD`)
  - `endDate` (string, `YYYY-MM-DD`)
  - `userId` (string)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a435339be609b0c1e1bdd44",
      "name": "Bob Smith",
      "email": "bob@company.com",
      "department": "Marketing",
      "totalDays": 10,
      "presentDays": 8,
      "lateDays": 1,
      "halfDays": 0,
      "onLeaveDays": 1,
      "totalWorkMinutes": 3840,
      "totalOvertimeMinutes": 120,
      "avgWorkMinutes": 480
    }
  ]
}
```

---

## 5. Leave Application Endpoints

### 5.1 Apply for Leave
Submits a leave application request.
- **Method:** `POST`
- **Path:** `/leaves`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "leaveType": "sick",
  "startDate": "2026-07-10T00:00:00.000Z",
  "endDate": "2026-07-12T00:00:00.000Z",
  "reason": "Recovering from flu."
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Leave application submitted successfully.",
  "data": {
    "_id": "6a450000be609b0c1e1bdde1",
    "userId": "6a435339be609b0c1e1bdd44",
    "leaveType": "sick",
    "startDate": "2026-07-10T00:00:00.000Z",
    "endDate": "2026-07-12T00:00:00.000Z",
    "reason": "Recovering from flu.",
    "status": "pending"
  }
}
```

### 5.2 Get My Leaves
List leaves submitted by the authenticated employee.
- **Method:** `GET`
- **Path:** `/leaves/my`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leaves": [
      {
        "_id": "6a450000be609b0c1e1bdde1",
        "leaveType": "sick",
        "startDate": "2026-07-10T00:00:00.000Z",
        "endDate": "2026-07-12T00:00:00.000Z",
        "reason": "Recovering from flu.",
        "status": "pending"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

### 5.3 List All Tenant Leaves
Admins/Managers list and filter all employee leaves.
- **Method:** `GET`
- **Path:** `/leaves`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
  - `status` (string: `pending`, `approved`, `rejected`, `cancelled`)
  - `userId` (string)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leaves": [
      {
        "_id": "6a450000be609b0c1e1bdde1",
        "userId": {
          "_id": "6a435339be609b0c1e1bdd44",
          "name": "Bob Smith",
          "email": "bob@company.com",
          "department": "Marketing"
        },
        "leaveType": "sick",
        "startDate": "2026-07-10T00:00:00.000Z",
        "endDate": "2026-07-12T00:00:00.000Z",
        "reason": "Recovering from flu.",
        "status": "pending"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

### 5.4 Update Leave (Edit or Review)
Allows employees to modify a pending application, OR administrators/managers to approve/reject it.
- **Method:** `PUT`
- **Path:** `/leaves/:id`
- **Authentication Required:** Yes
- **Request Body (For Employee - Pending Only):**
```json
{
  "leaveType": "sick",
  "reason": "Recovering from severe flu."
}
```
- **Request Body (For Manager/Admin):**
```json
{
  "status": "approved" // or "rejected"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Leave application approved successfully.",
  "data": {
    "_id": "6a450000be609b0c1e1bdde1",
    "status": "approved",
    "approvedBy": "6a435338be609b0c1e1bdd39"
  }
}
```

### 5.5 Cancel Leave Application
- **Method:** `DELETE`
- **Path:** `/leaves/:id`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Leave request cancelled."
}
```

---

## 6. Screenshots Endpoints

### 6.1 Upload Screenshot (Agent/Web)
Uploads screenshot with compression and triggers Socket.io notification.
- **Method:** `POST`
- **Path:** `/screenshots/upload`
- **Authentication Required:** Yes
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `screenshot`: File (Image binary)
  - `activityPercentage`: Number (Mouse/keyboard activity 0-100, optional)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Screenshot uploaded and logged successfully.",
  "data": {
    "screenshotUrl": "https://cloudinary.com/ems/...",
    "thumbnailUrl": "https://cloudinary.com/ems/thumbnails/...",
    "timestamp": "2026-07-06T12:00:00.000Z",
    "activityPercentage": 85,
    "productivityTag": "productive"
  }
}
```

### 6.2 List Screenshots
Fetch screenshots for review with pagination and tagging filter.
- **Method:** `GET`
- **Path:** `/screenshots`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `page`, `limit`
  - `userId` (string)
  - `startDate`, `endDate` (ISO timestamps)
  - `tag` (string: `productive`, `unproductive`, `neutral`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "screenshots": [
      {
        "_id": "6a460000be609b0c1e1bddf1",
        "userId": "6a435339be609b0c1e1bdd44",
        "screenshotUrl": "https://cloudinary.com/ems/...",
        "thumbnailUrl": "https://cloudinary.com/ems/...",
        "activityPercentage": 92,
        "productivityTag": "productive",
        "windowTitle": "VS Code - server.ts",
        "timestamp": "2026-07-06T12:05:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

### 6.3 Get Screenshot Details
- **Method:** `GET`
- **Path:** `/screenshots/:id`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6a460000be609b0c1e1bddf1",
    "screenshotUrl": "https://...",
    "windowTitle": "VS Code - server.ts",
    "appName": "Code"
  }
}
```

### 6.4 Delete Screenshot
- **Method:** `DELETE`
- **Path:** `/screenshots/:id`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Screenshot deleted successfully."
}
```

---

## 7. Activity Logs Endpoints

### 7.1 Log Activity
Sends single or multiple application/website usage logs.
- **Method:** `POST`
- **Path:** `/activity/log`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "appName": "Google Chrome",
  "windowTitle": "GitHub - Pull Request",
  "url": "https://github.com/PR-12",
  "durationSeconds": 180,
  "keystrokesCount": 240,
  "mouseClicksCount": 50,
  "startTime": "2026-07-06T12:00:00.000Z",
  "endTime": "2026-07-06T12:03:00.000Z"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Activity logged.",
  "data": {
    "appName": "Google Chrome",
    "category": "productive",
    "durationMinutes": 3
  }
}
```

### 7.2 List Activity Logs
- **Method:** `GET`
- **Path:** `/activity`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `page`, `limit`
  - `userId` (string)
  - `startDate`, `endDate` (ISO dates)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "6a470000be609b0c1e1bde02",
        "appName": "Google Chrome",
        "windowTitle": "GitHub",
        "category": "productive",
        "durationMinutes": 3,
        "timestamp": "2026-07-06T12:00:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20 }
  }
}
```

### 7.3 Get Activity Summary
Gets categorized aggregates (Productive vs Unproductive vs Neutral).
- **Method:** `GET`
- **Path:** `/activity/summary`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `userId` (string, optional)
  - `date` (string, `YYYY-MM-DD`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "productiveMinutes": 320,
    "unproductiveMinutes": 45,
    "neutralMinutes": 100,
    "totalMinutes": 465,
    "categories": [
      { "name": "Google Chrome", "minutes": 150, "category": "productive" },
      { "name": "Youtube", "minutes": 45, "category": "unproductive" }
    ]
  }
}
```

---

## 8. Productivity Stats & Keywords Endpoints

### 8.1 Get Productivity Stats
- **Method:** `GET`
- **Path:** `/productivity/stats`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `userId` (string, required)
  - `date` (string, `YYYY-MM-DD`, required)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "6a435339be609b0c1e1bdd44",
    "date": "2026-07-06",
    "productivityScore": 87,
    "activeMinutes": 420,
    "idleMinutes": 60,
    "productiveMinutes": 365,
    "unproductiveMinutes": 55
  }
}
```

### 8.2 Get Productivity Stats Range
- **Method:** `GET`
- **Path:** `/productivity/range`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `userId` (string, required)
  - `startDate` (string, `YYYY-MM-DD`, required)
  - `endDate` (string, `YYYY-MM-DD`, required)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-07-06",
      "score": 87,
      "activeMinutes": 420
    }
  ]
}
```

### 8.3 List Classified Keywords
Keywords/App names classified to evaluate activity productivity categories.
- **Method:** `GET`
- **Path:** `/productivity/keywords`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `category` (string: `productive`, `unproductive`, `neutral`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a480000be609b0c1e1bde10",
      "keyword": "vs code",
      "category": "productive",
      "weight": 1.0
    }
  ]
}
```

### 8.4 Create Classified Keyword
- **Method:** `POST`
- **Path:** `/productivity/keywords`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "keyword": "youtube",
  "category": "unproductive",
  "weight": 1.0
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "6a480000be609b0c1e1bde11",
    "keyword": "youtube",
    "category": "unproductive",
    "weight": 1.0
  }
}
```

### 8.5 Update Classified Keyword
- **Method:** `PUT`
- **Path:** `/productivity/keywords/:id`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "category": "neutral"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Keyword updated.",
  "data": {
    "_id": "6a480000be609b0c1e1bde11",
    "keyword": "youtube",
    "category": "neutral"
  }
}
```

### 8.6 Delete Keyword
- **Method:** `DELETE`
- **Path:** `/productivity/keywords/:id`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Keyword deleted."
}
```

---

## 9. Projects & Time Entries Endpoints

### 9.1 List Projects
- **Method:** `GET`
- **Path:** `/projects`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a490000be609b0c1e1bde50",
      "name": "Admin Redesign",
      "description": "Redesign UI/UX of admin panel",
      "status": "in-progress",
      "totalLoggedHours": 12.5
    }
  ]
}
```

### 9.2 Create Project
- **Method:** `POST`
- **Path:** `/projects`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Request Body:**
```json
{
  "name": "Mobile Sync API",
  "description": "Build local sync for offline offline agent",
  "startDate": "2026-07-06T00:00:00.000Z"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "6a490000be609b0c1e1bde51",
    "name": "Mobile Sync API",
    "status": "active"
  }
}
```

### 9.3 Update Project
- **Method:** `PUT`
- **Path:** `/projects/:id`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Request Body:**
```json
{
  "status": "completed",
  "endDate": "2026-07-15T00:00:00.000Z"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Project updated.",
  "data": { "_id": "6a490000be609b0c1e1bde51", "status": "completed" }
}
```

### 9.4 Get Time Entries for Project
- **Method:** `GET`
- **Path:** `/projects/:id/time-entries`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a490000be609b0c1e1bde58",
      "userId": "6a435339be609b0c1e1bdd44",
      "durationMinutes": 180,
      "description": "Developed database schema migrations.",
      "date": "2026-07-06"
    }
  ]
}
```

### 9.5 Add Work Time Entry to Project
Logs manual or automatic time towards a project.
- **Method:** `POST`
- **Path:** `/projects/:id/time-entries`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "durationMinutes": 120,
  "description": "Reviewed and optimized API route indexes.",
  "date": "2026-07-06"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Time entry logged successfully.",
  "data": {
    "_id": "6a490000be609b0c1e1bde59",
    "durationMinutes": 120,
    "description": "Reviewed and optimized API route indexes."
  }
}
```

---

## 10. Tasks Endpoints

### 10.1 List Tasks
- **Method:** `GET`
- **Path:** `/tasks`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a4a0000be609b0c1e1bde60",
      "title": "Fix Sockets cors error",
      "status": "todo",
      "priority": "high",
      "assignee": "6a435339be609b0c1e1bdd44"
    }
  ]
}
```

### 10.2 Create Task
- **Method:** `POST`
- **Path:** `/tasks`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "title": "Document mobile geo endpoints",
  "description": "Add payloads and responses detailing coordinates and geofences.",
  "priority": "medium",
  "assignee": "6a435339be609b0c1e1bdd44"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "_id": "6a4a0000be609b0c1e1bde61",
    "title": "Document mobile geo endpoints",
    "status": "todo"
  }
}
```

### 10.3 Update Task
Modifies status (`todo`, `in-progress`, `completed`), description, or title.
- **Method:** `PUT`
- **Path:** `/tasks/:id`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "status": "in-progress"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated.",
  "data": { "_id": "6a4a0000be609b0c1e1bde61", "status": "in-progress" }
}
```

---

## 11. Dashboard Summary Endpoints

### 11.1 Get Admin Dashboard Stats
Metrics summary for charts, lists, and tenant health overview.
- **Method:** `GET`
- **Path:** `/dashboard/admin`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 18,
    "activeOnline": 5,
    "onLeave": 2,
    "avgProductivity": 84.6,
    "todayPresentCount": 16,
    "todayLateCount": 3,
    "flaggedActivitiesCount": 12,
    "recentAlerts": [
      { "id": "1", "message": "Bob Smith punched in late (09:45 AM)", "type": "attendance" }
    ]
  }
}
```

### 11.2 Get Employee Dashboard Stats
Personal metrics summary for the logged-in user.
- **Method:** `GET`
- **Path:** `/dashboard/employee`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "todayWorkMinutes": 320,
    "todayBreakMinutes": 45,
    "weeklyAvgProductivity": 88,
    "pendingLeavesCount": 1,
    "assignedTasksCount": 3
  }
}
```

---

## 12. Location & Geofencing Endpoints

### 12.1 Log Live Location
Uploads current coordinate points.
- **Method:** `POST`
- **Path:** `/location/track` (Also alias `/location/update`)
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "latitude": 28.535517,
  "longitude": 77.391023,
  "accuracy": 8,
  "address": "Green Complex Office, Block C, Noida",
  "source": "mobile",
  "batteryLevel": 88,
  "networkType": "WIFI"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "locationLog": {
      "_id": "6a4b0000be609b0c1e1bde70",
      "userId": "6a435339be609b0c1e1bdd44",
      "latitude": 28.535517,
      "longitude": 77.391023,
      "accuracy": 8,
      "isInsideGeofence": true,
      "timestamp": "2026-07-06T12:30:00.000Z"
    },
    "isInsideGeofence": true
  }
}
```

### 12.2 Batch Log Coordinates
Bulk upload points recorded during offline states.
- **Method:** `POST`
- **Path:** `/location/batch`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "locations": [
    {
      "latitude": 28.535517,
      "longitude": 77.391023,
      "accuracy": 8,
      "address": "Green Complex Office",
      "batteryLevel": 85,
      "networkType": "MOBILE",
      "timestamp": "2026-07-06T12:00:00.000Z"
    },
    {
      "latitude": 28.536122,
      "longitude": 77.391511,
      "accuracy": 10,
      "address": "Adjacent Block D",
      "batteryLevel": 83,
      "networkType": "MOBILE",
      "timestamp": "2026-07-06T12:15:00.000Z"
    }
  ]
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "2 locations logged."
}
```

### 12.3 Geofence Boundary Check
Utility to verify if coordinates lie inside any defined office geofences.
- **Method:** `POST`
- **Path:** `/location/geofence-check`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "latitude": 28.535517,
  "longitude": 77.391023
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isInsideGeofence": true,
    "officeLocations": [
      {
        "name": "Noida HQ",
        "latitude": 28.5355,
        "longitude": 77.3910,
        "radiusMeters": 100
      }
    ]
  }
}
```

### 12.4 Get My Last Known Location
- **Method:** `GET`
- **Path:** `/location/current`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "latitude": 28.535517,
    "longitude": 77.391023,
    "address": "Green Complex Office, Block C, Noida",
    "updatedAt": "2026-07-06T12:30:00.000Z"
  }
}
```

### 12.5 Get Location History
Queries historical location coordinates.
- **Method:** `GET`
- **Path:** `/location/history`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `page`, `limit`
  - `userId` (string, admin/manager filter)
  - `startDate`, `endDate` (ISO dates)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "6a4b0000be609b0c1e1bde70",
        "userId": {
          "_id": "6a435339be609b0c1e1bdd44",
          "name": "Bob Smith",
          "employeeId": "EMP-0015"
        },
        "latitude": 28.535517,
        "longitude": 77.391023,
        "isInsideGeofence": true,
        "timestamp": "2026-07-06T12:30:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 50 }
  }
}
```

### 12.6 Get Live Locations of Active Staff
Gets current locations of all online employees.
- **Method:** `GET`
- **Path:** `/location/live`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": "6a435339be609b0c1e1bdd44",
      "name": "Bob Smith",
      "email": "bob@company.com",
      "department": "Marketing",
      "workMode": "office",
      "location": {
        "latitude": 28.535517,
        "longitude": 77.391023,
        "address": "Green Complex Office",
        "updatedAt": "2026-07-06T12:30:00.000Z"
      },
      "isOnline": true,
      "lastActive": "2026-07-06T12:30:00.000Z"
    }
  ]
}
```

### 12.7 Get Employee Trail Map
Fetches location trail points sequentially for maps rendering.
- **Method:** `GET`
- **Path:** `/location/trail`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Query Parameters:**
  - `userId` (string, required)
  - `date` (string, `YYYY-MM-DD`, required)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a4b0000be609b0c1e1bde70",
      "latitude": 28.535517,
      "longitude": 77.391023,
      "accuracy": 8,
      "timestamp": "2026-07-06T12:00:00.000Z"
    },
    {
      "_id": "6a4b0000be609b0c1e1bde71",
      "latitude": 28.536122,
      "longitude": 77.391511,
      "accuracy": 10,
      "timestamp": "2026-07-06T12:15:00.000Z"
    }
  ]
}
```

---

## 13. Mobile App Specific Endpoints

### 13.1 Mobile Login
Specially optimized login route returning tenant geofence limits and config details.
- **Method:** `POST`
- **Path:** `/mobile/login`
- **Authentication Required:** No
- **Request Body:**
```json
{
  "email": "employee@company.com",
  "password": "Password123!",
  "deviceId": "mobile_uuid_99998888"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "6a435339be609b0c1e1bdd44",
      "name": "Bob Smith",
      "email": "bob@company.com",
      "role": "employee",
      "tenantId": "6a435338be609b0c1e1bdd38"
    },
    "tenant": {
      "id": "6a435338be609b0c1e1bdd38",
      "name": "Enterprise Solutions Ltd",
      "settings": {
        "enableGeofencing": true,
        "officeLocations": [
          { "name": "Noida HQ", "latitude": 28.5355, "longitude": 77.3910, "radiusMeters": 100 }
        ],
        "mobileLocationInterval": 15,
        "requireLocationForPunch": true,
        "workStartTime": "09:00",
        "workEndTime": "18:00"
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

### 13.2 Mobile Punch In (Location Enforced)
Punch in checking geofence coordinates boundaries on server-side.
- **Method:** `POST`
- **Path:** `/mobile/punch-in`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "latitude": 28.535517,
  "longitude": 77.391023,
  "accuracy": 10,
  "address": "Noida HQ Building",
  "workMode": "office"
}
```
- **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Punched in successfully.",
  "data": {
    "attendance": {
      "_id": "6a440000be609b0c1e1bdd90",
      "date": "2026-07-06",
      "status": "present",
      "punchIn": {
        "time": "2026-07-06T09:05:00.000Z",
        "isInsideGeofence": true
      }
    },
    "isInsideGeofence": true
  }
}
```

### 13.3 Mobile Punch Out
- **Method:** `POST`
- **Path:** `/mobile/punch-out`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "latitude": 28.535517,
  "longitude": 77.391023,
  "accuracy": 10,
  "address": "Noida HQ Building"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Punched out successfully.",
  "data": {
    "attendance": {
      "_id": "6a440000be609b0c1e1bdd90",
      "punchOut": { "time": "2026-07-06T18:00:00.000Z" }
    },
    "isInsideGeofence": true
  }
}
```

### 13.4 Update Work Mode
Updates user state: `office`, `wfh`, or `field`.
- **Method:** `PUT`
- **Path:** `/mobile/work-mode`
- **Authentication Required:** Yes
- **Request Body:**
```json
{
  "workMode": "field"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Work mode updated to field."
}
```

### 13.5 Get Mobile Tracking Configuration
- **Method:** `GET`
- **Path:** `/mobile/config`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enableGeofencing": true,
    "officeLocations": [
      { "name": "Noida HQ", "latitude": 28.5355, "longitude": 77.3910, "radiusMeters": 100 }
    ],
    "mobileLocationInterval": 15,
    "requireLocationForPunch": true,
    "workStartTime": "09:00",
    "workEndTime": "18:00"
  }
}
```

### 13.6 Get Mobile Dashboard Metrics
Fast summary metrics containing current attendance and logged locations today.
- **Method:** `GET`
- **Path:** `/mobile/dashboard`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "todayAttendance": {
      "punchIn": { "time": "2026-07-06T09:05:00.000Z" },
      "punchOut": null,
      "status": "present"
    },
    "workMode": "office",
    "locationUpdates": 14
  }
}
```

---

## 14. Notification Endpoints

### 14.1 List My Notifications
Retrieves in-app notifications.
- **Method:** `GET`
- **Path:** `/notifications`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `page` (number, default: 1)
  - `limit` (number, default: 20)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "6a4c0000be609b0c1e1bde80",
        "title": "Leave Approved",
        "message": "Your leave request for 2026-07-10 has been approved.",
        "read": false,
        "link": "/leaves",
        "createdAt": "2026-07-06T12:00:00.000Z"
      }
    ],
    "unreadCount": 1,
    "pagination": { "total": 1, "page": 1, "limit": 20 }
  }
}
```

### 14.2 Mark Notification as Read
- **Method:** `PUT`
- **Path:** `/notifications/:id/read`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification marked as read.",
  "data": { "_id": "6a4c0000be609b0c1e1bde80", "read": true }
}
```

### 14.3 Mark All Notifications as Read
- **Method:** `PUT`
- **Path:** `/notifications/read-all`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read."
}
```

### 14.4 Delete Notification
- **Method:** `DELETE`
- **Path:** `/notifications/:id`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted successfully."
}
```

---

## 15. Report compilation & Export Endpoints

### 15.1 Get Attendance Report Details
- **Method:** `GET`
- **Path:** `/reports/attendance`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Query Parameters:**
  - `startDate` (string, `YYYY-MM-DD`)
  - `endDate` (string, `YYYY-MM-DD`)
  - `userId` (string)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "name": "Bob Smith",
      "email": "bob@company.com",
      "department": "Marketing",
      "totalDays": 10,
      "presentDays": 8,
      "lateDays": 1,
      "onLeaveDays": 1,
      "totalWorkMinutes": 3840,
      "avgWorkMinutes": 480
    }
  ]
}
```

### 15.2 Get Productivity Report Details
- **Method:** `GET`
- **Path:** `/reports/productivity`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "name": "Bob Smith",
      "email": "bob@company.com",
      "productiveMinutes": 1200,
      "unproductiveMinutes": 180,
      "neutralMinutes": 420,
      "totalMinutes": 1800
    }
  ]
}
```

### 15.3 Get Activity App Usage Report
- **Method:** `GET`
- **Path:** `/reports/activity`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "appName": "VS Code",
      "userName": "Bob Smith",
      "userEmail": "bob@company.com",
      "totalMinutes": 840
    }
  ]
}
```

### 15.4 Get Screenshot Classifications Report
- **Method:** `GET`
- **Path:** `/reports/screenshots`
- **Authentication Required:** Yes (Role: `company_admin`, `manager`, `super_admin`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "name": "Bob Smith",
      "email": "bob@company.com",
      "productiveCount": 42,
      "unproductiveCount": 3,
      "neutralCount": 8,
      "totalCount": 53
    }
  ]
}
```

### 15.5 Export Report to Excel
- **Method:** `GET`
- **Path:** `/reports/export/excel`
- **Authentication Required:** Yes
- **Query Parameters:**
  - `type` (string, required: `attendance`, `productivity`, `activity`, `screenshots`)
  - `startDate`, `endDate` (string, `YYYY-MM-DD`)
  - `userId` (string)
- **Response Headers:**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename=<type>_report.xlsx`
- **Response:** Excel Binary File Stream

### 15.6 Export Report to PDF
- **Method:** `GET`
- **Path:** `/reports/export/pdf`
- **Authentication Required:** Yes
- **Query Parameters:** Same as Excel
- **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename=<type>_report.pdf`
- **Response:** PDF Document Binary File Stream

---

## 16. Company Settings Endpoints

### 16.1 Get Company & Monitoring Settings
- **Method:** `GET`
- **Path:** `/settings`
- **Authentication Required:** Yes
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "company": {
      "name": "Enterprise Solutions Ltd",
      "email": "admin@enterprise.com",
      "phone": "+91 9999988888",
      "domain": "enterprise.com",
      "address": "402 Technology Park, Noida",
      "logo": "https://res.cloudinary.com/ems/..."
    },
    "monitoring": {
      "screenshotInterval": 5,
      "trackApps": true,
      "trackUrls": true,
      "blurScreenshots": false,
      "workStartTime": "09:00",
      "workEndTime": "18:00",
      "timezone": "UTC",
      "allowManualPunch": true,
      "autoStopTracking": true,
      "idleTimeThreshold": 5,
      "enableGeofencing": true,
      "officeLocations": [
        { "name": "Noida HQ", "latitude": 28.5355, "longitude": 77.3910, "radiusMeters": 100 }
      ],
      "mobileLocationInterval": 15,
      "requireLocationForPunch": true
    },
    "plan": "starter",
    "status": "active"
  }
}
```

### 16.2 Update Settings
- **Method:** `PUT`
- **Path:** `/settings`
- **Authentication Required:** Yes (Role: `company_admin`, `super_admin`)
- **Request Body (All fields optional):**
```json
{
  "company": {
    "name": "Enterprise Solutions Global"
  },
  "monitoring": {
    "screenshotInterval": 10,
    "blurScreenshots": true,
    "officeLocations": [
      { "name": "Noida HQ", "latitude": 28.5355, "longitude": 77.3910, "radiusMeters": 150 }
    ]
  }
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Settings updated.",
  "data": { "...updated settings object..." }
}
```

---

## 17. Tenant Management Endpoints (Super Admin Only)

### 17.1 List All Platform Tenants
- **Method:** `GET`
- **Path:** `/tenants`
- **Authentication Required:** Yes (Role: `super_admin` only)
- **Query Parameters:** `page`, `limit`, `status`, `search`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "_id": "6a435338be609b0c1e1bdd38",
        "name": "Enterprise Solutions Ltd",
        "email": "admin@enterprise.com",
        "plan": "starter",
        "status": "active",
        "employeeCount": 18
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20 }
  }
}
```

### 17.2 Get Tenant & Subscription Details
- **Method:** `GET`
- **Path:** `/tenants/:id`
- **Authentication Required:** Yes (Role: `super_admin` only)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "6a435338be609b0c1e1bdd38",
    "name": "Enterprise Solutions Ltd",
    "employeeCount": 18,
    "subscription": {
      "_id": "sub_6717a1",
      "status": "active",
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2027-01-01T00:00:00.000Z"
    }
  }
}
```

### 17.3 Update Tenant Plan/Status
- **Method:** `PUT`
- **Path:** `/tenants/:id`
- **Authentication Required:** Yes (Role: `super_admin` only)
- **Request Body:**
```json
{
  "plan": "enterprise",
  "status": "active"
}
```
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tenant updated.",
  "data": { "_id": "6a435338be609b0c1e1bdd38", "plan": "enterprise" }
}
```

### 17.4 Suspend Tenant
Suspends the tenant and deactivates all belonging user accounts.
- **Method:** `DELETE`
- **Path:** `/tenants/:id`
- **Authentication Required:** Yes (Role: `super_admin` only)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Tenant suspended."
}
```

---

## 18. Agent (Desktop App) Endpoints
These endpoints are invoked by the Desktop Agent client and authenticated using the `x-agent-key` header.

### 18.1 Agent Heartbeat
- **Method:** `POST`
- **Path:** `/agent/heartbeat`
- **Request Header:** `x-agent-key: <agentKey>`
- **Request Body:**
```json
{
  "status": "active",
  "activeWindow": "Visual Studio Code"
}
```
- **Success Response (200 OK):**
```json
{ "success": true, "message": "Heartbeat recorded." }
```

### 18.2 Agent Sync Offline Activity
- **Method:** `POST`
- **Path:** `/agent/sync`
- **Request Header:** `x-agent-key: <agentKey>`
- **Request Body:**
```json
{
  "activities": [
    {
      "appName": "Slack",
      "windowTitle": "Project Sync",
      "durationSeconds": 300,
      "timestamp": "2026-07-06T11:00:00.000Z"
    }
  ],
  "screenshots": []
}
```
- **Success Response (200 OK):**
```json
{ "success": true, "message": "Offline data synced." }
```

### 18.3 Get Agent Configurations
- **Method:** `GET`
- **Path:** `/agent/config`
- **Request Header:** `x-agent-key: <agentKey>`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "screenshotInterval": 5,
    "trackApps": true,
    "trackUrls": true,
    "blurScreenshots": false,
    "idleTimeThreshold": 5
  }
}
```

---

## 19. Real-time Socket.io Events

The Express backend hosts a Socket.io server integrated with JWT handshake verification.

### 19.1 Handshake Connection
When initializing the Socket.io client, pass the authorization JWT token:
```javascript
const socket = io("http://localhost:5000", {
  auth: {
    token: "<accessToken>"
  }
});
```

### 19.2 Incoming Events (Emit from Frontend)

#### `join-tenant`
Subscribes the socket connection to the tenant room for real-time broadcasts.
- **Payload:** String (Tenant ID)
```javascript
socket.emit("join-tenant", "6a435338be609b0c1e1bdd38");
```

#### `employee-status`
Broadcasts employee status updates (only allowed for `company_admin` or `manager`).
- **Payload:**
```json
{
  "userId": "6a435339be609b0c1e1bdd44",
  "status": "break"
}
```

#### `new-screenshot`
Notifies that a new screenshot is uploaded.
- **Payload:**
```json
{
  "screenshot": {
    "screenshotUrl": "https://cloudinary.com/ems/...",
    "productivityTag": "productive"
  }
}
```

### 19.3 Outgoing Events (Listen on Frontend)

#### `employee-status-update`
Fires when an employee's live status changes.
- **Payload:**
```json
{
  "userId": "6a435339be609b0c1e1bdd44",
  "status": "break",
  "updatedAt": "2026-07-06T12:00:00.000Z"
}
```

#### `screenshot-received`
Broadcasts to administrative dashboard when a new employee screenshot arrives.
- **Payload:**
```json
{
  "screenshot": {
    "screenshotUrl": "https://cloudinary.com/ems/...",
    "productivityTag": "productive"
  },
  "userId": "6a435339be609b0c1e1bdd44",
  "receivedAt": "2026-07-06T12:00:00.000Z"
}
```

#### `error`
Fires if any real-time request fails authentication or parameter validation.
- **Payload:**
```json
{
  "code": "TENANT_MISMATCH",
  "message": "Unauthorized - you do not belong to this tenant"
}
```

---

## 20. Error Codes & Reference

All error responses adhere to the standard JSON error schema:
```json
{
  "success": false,
  "message": "Error description message."
}
```

| HTTP Status | Message Scenario | Fix / Description |
|---|---|---|
| `400 Bad Request` | Missing required body fields (e.g. coordinates or leave duration). | Verify payload parameters match the endpoint definition. |
| `401 Unauthorized` | Invalid or expired token / Missing token in header. | Refresh the token using the refresh-token endpoint, or prompt login. |
| `403 Forbidden` | Accessing resource outside tenant scope or insufficient role. | Check if role matches required endpoints access. |
| `404 Not Found` | Entity not found (e.g. employee ID or leave request ID). | Check spelling of resource ID in path parameters. |
| `429 Too Many Requests` | Limit exceeded for punch-ins or screenshot uploads. | Wait and retry after headers `Retry-After` timestamp. |
| `500 Internal Error` | Database connection drops or files fail uploading. | Report to backend system engineering. |
