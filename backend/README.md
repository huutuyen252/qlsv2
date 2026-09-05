# 🔧 Backend - QLSV

Backend API cho hệ thống quản lý sinh viên.

## 📦 Tech Stack

- **Express.js** - Web framework
- **Node.js** - Runtime
- **TypeScript** - Type safety
- **PostgreSQL** - Database (via Drizzle ORM)
- **Firebase Admin** - Authentication
- **Cloudinary** - File storage

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database management
npm run db:push      # Push schema to DB
npm run db:studio    # Open Drizzle Studio
```

## 📁 Project Structure

```
src/
├── routes/              # API endpoints
│   ├── auth.ts         # Authentication endpoints
│   ├── users.ts        # User management
│   ├── students.ts     # Student management
│   ├── grades.ts       # Grade management
│   ├── subjects.ts     # Subject management
│   ├── schedule.ts     # Schedule management
│   ├── attendance.ts   # Attendance endpoints
│   └── reports.ts      # Reports endpoints
├── controllers/         # Business logic
│   └── authController.ts
├── middleware/          # Express middleware
│   ├── errorHandler.ts # Error handling
│   ├── requestLogger.ts # Request logging
│   └── auth.ts         # Authentication middleware
├── services/           # Business logic & DB operations
│   └── userService.ts
├── db/                 # Database layer
│   ├── schema.ts       # Drizzle ORM schema
│   ├── index.ts        # Database initialization
│   └── drizzle.config.ts
├── lib/                # Utilities
│   ├── firebase-admin.ts
│   └── ...
├── types/              # TypeScript types
│   └── index.ts
├── utils/              # Helper functions
│   └── ...
└── server.ts           # Entry point
```

## ⚙️ Environment Variables

Create `.env`:

```env
# Database (PostgreSQL)
SQL_HOST=localhost
SQL_PORT=5432
SQL_DB_NAME=qlsv_db
SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=password
SQL_SSL=false

# Server
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173

# Firebase
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
FIREBASE_DATABASE_URL=your_database_url

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Students
- `GET /api/students` - List students
- `POST /api/students` - Create student
- `GET /api/students/:id` - Get student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Grades
- `GET /api/grades` - List grades
- `POST /api/grades` - Create grade
- `GET /api/grades/:id` - Get grade
- `PUT /api/grades/:id` - Update grade

### More endpoints...

See code for complete API documentation.

## 🗄️ Database

### PostgreSQL + Drizzle ORM

- Type-safe ORM
- SQL migrations
- Schema validation

### Initialize Database

```bash
npm run db:push
```

### View Database

```bash
npm run db:studio
```

## 🚢 Deployment

### Render.com

1. Create new Web Service
2. Connect GitHub repository
3. Configure:
   - Build: `npm install && npm run build --prefix backend`
   - Start: `npm start --prefix backend`
4. Add environment variables
5. Deploy

### Railway

Similar process with Railway platform.

See [DEPLOYMENT.md](../DEPLOYMENT.md) for detailed instructions.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run TypeScript check
- `npm run db:push` - Push database schema
- `npm run db:studio` - Open database studio

## 🔒 Security

- CORS configuration
- Error handling middleware
- Request logging
- Environment variable management
- Input validation
- Firebase authentication

## 📊 Monitoring

- Request logging middleware
- Error tracking
- Database query logging

## 🤝 Error Handling

All errors are handled by middleware:
- Proper HTTP status codes
- Consistent JSON responses
- Detailed error messages (dev only)

## 📚 Learn More

- [Express Documentation](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

For full project documentation, see [README.md](../README.md)
