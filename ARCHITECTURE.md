# 🏗️ Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                              │
│                    (Student, Teacher, Admin)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FRONTEND - VERCEL DEPLOYMENT                    │
│  React 19 + Vite + TypeScript + Tailwind CSS + Firebase Auth   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Components Layer                                      │   │
│  │  ├── Auth Components (LoginScreen, ProtectedRoute)   │   │
│  │  ├── Admin Components (UserMgmt, AuditLogs)          │   │
│  │  ├── Grade Components (GradeView, Transcript)        │   │
│  │  ├── Schedule Components (TimeTable, ExamNotice)     │   │
│  │  └── Common Components (Header, Sidebar, Breadcrumb) │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  State Management (React Context)                     │   │
│  │  ├── ThemeContext (Dark/Light mode)                   │   │
│  │  └── AuthContext (User session)                       │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  API Layer (apiService)                               │   │
│  │  └── HTTP client with interceptors                    │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ REST API (HTTPS)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│             BACKEND - RENDER/RAILWAY DEPLOYMENT                │
│     Express.js + Node.js + TypeScript + PostgreSQL             │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Routes Layer (/api/...)                              │   │
│  │  ├── /auth (login, logout, refresh)                   │   │
│  │  ├── /users (CRUD operations)                         │   │
│  │  ├── /students (student management)                   │   │
│  │  ├── /grades (grade operations)                       │   │
│  │  ├── /subjects (subject management)                   │   │
│  │  ├── /schedule (timetable management)                 │   │
│  │  ├── /attendance (attendance tracking)                │   │
│  │  └── /reports (generate reports)                      │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Controllers Layer                                     │   │
│  │  ├── authController (authentication logic)            │   │
│  │  ├── userController (user operations)                 │   │
│  │  ├── studentController (student operations)           │   │
│  │  ├── gradeController (grade operations)               │   │
│  │  └── ... (other controllers)                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                        │   │
│  │  ├── userService (user business logic)                │   │
│  │  ├── authService (authentication service)             │   │
│  │  ├── gradeService (grade calculations)                │   │
│  │  └── ... (other services)                             │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                      │   │
│  │  ├── errorHandler (error handling)                    │   │
│  │  ├── requestLogger (request logging)                  │   │
│  │  ├── authMiddleware (token verification)              │   │
│  │  └── corsMiddleware (CORS configuration)              │   │
│  └────────────────────────────────────────────────────────┘   │
│                              │                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Database Layer (Drizzle ORM)                         │   │
│  │  ├── schema.ts (table definitions)                    │   │
│  │  ├── dbOperations.ts (CRUD queries)                   │   │
│  │  └── migrations (schema changes)                      │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ PostgreSQL Connection Pool
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         DATABASE - NEON.TECH DEPLOYMENT                        │
│                PostgreSQL 16                                   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Tables:                                               │   │
│  │  ├── users (accounts & authentication)                │   │
│  │  ├── sinh_vien (student information)                  │   │
│  │  ├── mon_hoc (course/subject data)                    │   │
│  │  ├── diem (grades & transcripts)                      │   │
│  │  ├── ren_luyen (training scores)                      │   │
│  │  ├── thoi_khoa_bieu (timetable)                       │   │
│  │  ├── diem_danh (attendance)                           │   │
│  │  ├── thi_lai_hoc_lai (retakes)                        │   │
│  │  └── ... (other tables)                               │   │
│  │                                                        │   │
│  │  Features:                                            │   │
│  │  ├── Connection pooling                              │   │
│  │  ├── Automatic backups                               │   │
│  │  ├── SSL/TLS encryption                              │   │
│  │  └── Point-in-time recovery                          │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ Upload Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         CLOUD STORAGE - CLOUDINARY DEPLOYMENT                  │
│              Image Hosting & CDN                               │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Features:                                             │   │
│  │  ├── Image upload & storage                           │   │
│  │  ├── Automatic optimization                           │   │
│  │  ├── CDN delivery (global)                            │   │
│  │  ├── Image transformations                            │   │
│  │  └── Analytics                                        │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

                            │
                   Firebase Authentication
                            │
┌─────────────────────────────────────────────────────────────────┐
│       AUTHENTICATION - FIREBASE DEPLOYMENT                      │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Features:                                             │   │
│  │  ├── Email/Password authentication                    │   │
│  │  ├── Social login (Google, Facebook, etc.)            │   │
│  │  ├── JWT token generation                             │   │
│  │  ├── Session management                               │   │
│  │  └── Security rules                                   │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Authentication Flow
```
1. User enters credentials (frontend)
   ↓
2. Frontend sends POST /api/auth/login (backend)
   ↓
3. Backend validates with Firebase
   ↓
4. Firebase returns JWT token
   ↓
5. Backend returns token to frontend
   ↓
6. Frontend stores token in localStorage/sessionStorage
   ↓
7. Frontend includes token in Authorization header for future requests
```

### API Request Flow
```
1. Frontend component calls API
   ↓
2. apiService adds auth headers
   ↓
3. Request goes through middleware (CORS, logging)
   ↓
4. Routes dispatcher finds matching endpoint
   ↓
5. Controller receives request
   ↓
6. Service layer performs business logic
   ↓
7. Database layer executes query
   ↓
8. Response returned through layers
   ↓
9. Frontend receives response & updates UI
```

---

## Technology Decisions

### Frontend
- **React 19** - Latest with Server Components support
- **Vite** - Lightning-fast build tool
- **TypeScript** - Type safety & better DX
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Easy authentication & real-time features

### Backend
- **Express.js** - Minimal & flexible Node.js framework
- **TypeScript** - Type safety for backend code
- **Drizzle ORM** - SQL database with type safety
- **PostgreSQL** - Reliable, ACID-compliant database

### Infrastructure
- **Vercel** - Best-in-class frontend deployment
- **Render/Railway** - Scalable backend hosting
- **Neon.tech** - Serverless PostgreSQL
- **Cloudinary** - Cloud storage & CDN

---

## Scalability Considerations

### Frontend Scaling
- CDN distribution via Vercel
- Code splitting with Vite
- Lazy loading of components
- Service workers for offline support

### Backend Scaling
- Stateless design (easier to scale)
- Database connection pooling
- Caching strategies (Redis ready)
- Load balancing (Render handles this)

### Database Scaling
- Read replicas available on Neon
- Partitioning for large tables
- Index optimization
- Query optimization

---

## Security Architecture

```
HTTPS (All connections encrypted)
   ↓
CORS (Cross-Origin Resource Sharing)
   ↓
Firebase Auth (Token-based authentication)
   ↓
JWT Verification (Backend validates tokens)
   ↓
Authorization (Role-based access control)
   ↓
Input Validation (Server-side validation)
   ↓
Database (SSL connection, encrypted)
```

---

## Deployment Architecture

```
GitHub (Source Control)
   ↓
CI/CD Pipeline (.github/workflows)
   ↓
├─ Test & Build Frontend
│  └─ Deploy to Vercel
│
└─ Test & Build Backend
   └─ Deploy to Render/Railway
```

---

## Monitoring & Logging

### Frontend
- Browser DevTools
- Error tracking (Sentry ready)
- Performance monitoring (Web Vitals)

### Backend
- Request logging middleware
- Error logging
- Database query logs
- Performance monitoring

### Database
- Query performance logs
- Backup verification
- Connection monitoring

---

## Environment Separation

```
Development (Local)
├── Frontend: localhost:5173
├── Backend: localhost:3000
└── Database: PostgreSQL (local or Docker)

Staging (Optional)
├── Frontend: staging.vercel.app
├── Backend: staging.render.com
└── Database: Neon (staging)

Production
├── Frontend: qlsv.vercel.app
├── Backend: qlsv-api.render.com
└── Database: Neon (production)
```

---

## Best Practices Applied

✅ **Separation of Concerns** - Frontend, backend, database separated
✅ **Type Safety** - TypeScript throughout
✅ **Scalability** - Stateless design, cloud-native
✅ **Security** - HTTPS, JWT, CORS, input validation
✅ **Maintainability** - Clear folder structure, documentation
✅ **Performance** - CDN, caching, optimization
✅ **Reliability** - Error handling, logging, monitoring
✅ **DevOps** - Docker support, CI/CD ready, env management

---

For deployment details, see [DEPLOYMENT.md](./DEPLOYMENT.md)
