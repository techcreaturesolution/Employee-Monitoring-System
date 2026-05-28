# Employee Monitoring System (EMS) — SaaS Platform

A multi-tenant SaaS platform for employee desktop/laptop monitoring with screenshot capture, punch in/out time tracking, application usage monitoring, and productivity analytics.

## Features

### For Company Admins / CEOs
- **Real-time Dashboard** — Live overview of employee activity, attendance, and productivity
- **Screenshot Monitoring** — Periodic screenshots from employee desktops with timeline view
- **Attendance Tracking** — Punch in/out with time, IP, and location logging
- **Application Tracking** — Monitor which apps employees are using and for how long
- **Productivity Analytics** — Categorize activities as productive, neutral, or unproductive
- **Employee Management** — Add, edit, deactivate employees with role-based access
- **Project Time Tracking** — Track time spent on projects
- **Reports** — Attendance reports, productivity reports, timesheet exports
- **Settings** — Configure screenshot intervals, work hours, idle thresholds

### For Employees
- **Personal Dashboard** — View own attendance and activity
- **Web Punch In/Out** — One-click punch from the web portal
- **Break Management** — Start/end breaks with tracking
- **Activity History** — View personal activity and screenshot logs

### Desktop Agent
- **Automatic Screenshots** — Configurable interval (1-60 minutes)
- **Active Window Tracking** — Captures current app and window title
- **Heartbeat System** — Reports online status to server
- **Agent Key Auth** — Secure per-employee API key authentication
- **Auto Punch In/Out** — Punch via the agent

### SaaS Features
- **Multi-Tenant Architecture** — Each company is isolated
- **Subscription Plans** — Free, Starter, Business, Enterprise
- **Super Admin Portal** — Platform-wide management
- **Razorpay Integration** — Subscription billing (ready for integration)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express, TypeScript, MongoDB, Socket.io |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| **Desktop Agent** | Node.js, TypeScript, screenshot-desktop |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (access + refresh tokens) |
| **File Upload** | Multer (local storage, S3-ready) |
| **Real-time** | Socket.io |

## Project Structure

```
Employee-Monitoring-System/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── config/          # App & DB configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/       # Auth, error handling, upload
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API route definitions
│   │   ├── scripts/         # DB seed script
│   │   ├── utils/           # Helper functions
│   │   └── server.ts        # Express app entry
│   └── package.json
├── admin-portal/            # React frontend
│   ├── src/
│   │   ├── components/      # Shared components (Layout)
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Route definitions
│   └── package.json
├── desktop-agent/           # Desktop monitoring agent
│   ├── src/
│   │   ├── agent.ts         # Agent service class
│   │   └── index.ts         # Entry point
│   └── package.json
├── docs/
│   └── SRS.md               # Software Requirements Spec
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/techcreaturesolution/Employee-Monitoring-System.git
cd Employee-Monitoring-System

# Install all dependencies
cd backend && npm install
cd ../admin-portal && npm install
cd ../desktop-agent && npm install
cd ..
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and secrets

# Desktop Agent
cp desktop-agent/.env.example desktop-agent/.env
# Set AGENT_KEY from admin portal
```

### 3. Seed Database

```bash
cd backend && npm run seed
```

This creates:
- **Super Admin**: `admin@employeemonitor.com` / `Admin@123456`
- **Demo Company**: `admin@democompany.com` / `Demo@123456`
- **Demo Employees**: `emp1@democompany.com` - `emp5@democompany.com` / `Emp@123456`

### 4. Start Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd admin-portal && npm run dev
```

- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:5173
- **API Health**: http://localhost:5000/api/health

### 5. Start Desktop Agent (Optional)

```bash
cd desktop-agent
# Set AGENT_KEY in .env (get from admin portal → Employees → Agent Key)
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register company |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Add employee |
| POST | `/api/attendance/punch-in` | Punch in |
| POST | `/api/attendance/punch-out` | Punch out |
| GET | `/api/attendance/history` | Attendance history |
| POST | `/api/screenshots/upload` | Upload screenshot |
| GET | `/api/screenshots` | List screenshots |
| GET | `/api/activity/summary` | Activity summary |
| GET | `/api/dashboard/admin` | Admin dashboard |
| POST | `/api/agent/heartbeat` | Agent heartbeat |
| POST | `/api/agent/screenshot` | Agent screenshot upload |
| GET | `/api/agent/config` | Agent configuration |

See [docs/SRS.md](docs/SRS.md) for complete API documentation.

## Subscription Plans

| Feature | Free | Starter (₹999) | Business (₹2,999) | Enterprise (₹9,999) |
|---------|------|-----------------|--------------------|-----------------------|
| Employees | 5 | 25 | 100 | Unlimited |
| Screenshots/day | 50 | 500 | 2,000 | Unlimited |
| Interval | 30 min | 10 min | 5 min | 1 min |
| Data Retention | 7 days | 30 days | 90 days | 365 days |
| Reports | Basic | Advanced | Advanced | Custom |

## User Roles

| Role | Access |
|------|--------|
| `super_admin` | Platform management, all tenants |
| `company_admin` | Full company management |
| `manager` | Team monitoring |
| `employee` | Personal data only |

## License

MIT
