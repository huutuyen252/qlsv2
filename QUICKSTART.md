# ⚡ Quick Start Guide

## 🚀 5 Phút Setup

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Setup Environment Files
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Edit files với credentials của bạn
# - Database credentials (nếu dùng local PostgreSQL)
# - Firebase config
# - Cloudinary keys
```

### 3. Database Setup (Development)

**Option A: Local PostgreSQL**
```bash
# Windows - Sử dụng WSL hoặc Git Bash
psql -U postgres
postgres=# CREATE DATABASE qlsv_db;

# Update backend/.env
SQL_HOST=localhost
SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=your_password

# Migrate schema
cd backend
npm run db:push
```

**Option B: Docker (Recommended)**
```bash
npm run docker:up
# PostgreSQL sẽ chạy ở localhost:5432
```

### 4. Run Development Servers
```bash
npm run dev
```

Hoặc riêng lẻ:
```bash
# Terminal 1
npm run dev:frontend   # http://localhost:5173

# Terminal 2
npm run dev:backend    # http://localhost:3000
```

### 5. Test Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Login (test endpoint)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

---

## 🐳 Docker Development

Nhanh nhất cách này:

```bash
# Start everything (Frontend + Backend + Database)
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Database: localhost:5432

---

## 📝 Project Structure Overview

```
qlsv2/
├── frontend/        # React app (Vercel deployment)
├── backend/         # Express API (Render/Railway deployment)
├── docker-compose.yml
└── DEPLOYMENT.md    # Full deployment guide
```

---

## 📚 Next Steps

1. **Development**: See `frontend/README.md` and `backend/README.md`
2. **Deployment**: See `DEPLOYMENT.md`
3. **Project Overview**: See main `README.md`
4. **Checklist**: See `RESTRUCTURE_CHECKLIST.md`

---

## 🆘 Common Issues

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5173
npx kill-port 5173
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres

# Check credentials in backend/.env
```

### CORS Errors
```bash
# Update backend/.env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json frontend/node_modules backend/node_modules
npm run install:all
```

---

## 🎯 Development Tips

- **Hot Reload**: Cả frontend và backend hỗ trợ hot reload
- **Debug**: Sử dụng VS Code debugger
- **Logs**: Check terminal output cho debugging
- **Database**: Sử dụng `npm run db:studio` để view database GUI

---

🎉 You're ready to go! Happy coding!
