# 🚀 DEPLOYMENT GUIDE - QLSV

## Tổng quan kiến trúc Deployment

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vercel)                                      │
│  - React + Vite                                         │
│  - Auto deployment trên mỗi push                       │
│  - CDN Global                                           │
└────────────────┬────────────────────────────────────────┘
                 │
              HTTPS (Secure)
                 │
┌────────────────▼────────────────────────────────────────┐
│  Backend API (Render/Railway)                           │
│  - Express.js + Node.js                                │
│  - Auto deployment CI/CD                               │
│  - Load Balancer & Auto Scaling                        │
└────────────────┬────────────────────────────────────────┘
                 │
         Private Connection (SSL)
                 │
┌────────────────▼────────────────────────────────────────┐
│  Database (Neon.tech PostgreSQL)                       │
│  - Cloud PostgreSQL                                     │
│  - Automatic Backup                                     │
│  - Connection Pooling                                   │
└─────────────────────────────────────────────────────────┘
                 │
         Upload Connection
                 │
┌────────────────▼────────────────────────────────────────┐
│  Cloud Storage (Cloudinary)                            │
│  - Image Hosting                                        │
│  - CDN Delivery                                         │
│  - Image Transformation                                │
└─────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Database Setup (Neon.tech PostgreSQL)

### Step 1: Tạo tài khoản Neon
1. Truy cập [neon.tech](https://neon.tech)
2. Đăng ký với GitHub hoặc Email
3. Xác minh email

### Step 2: Tạo Project
1. Bấm "Create new project"
2. Chọn region: Singapore (để giảm latency)
3. PostgreSQL version: 16 (latest)
4. Tên database: `qlsv_db`

### Step 3: Lấy Connection String
```
postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/qlsv_db?sslmode=require
```

### Step 4: Setup environment
```bash
# Backend .env
SQL_HOST=ep-xxxx.ap-southeast-1.aws.neon.tech
SQL_PORT=5432
SQL_DB_NAME=qlsv_db
SQL_ADMIN_USER=neondb_owner
SQL_ADMIN_PASSWORD=<your-password>
SQL_SSL=true
```

### Step 5: Migrate Database
```bash
cd backend
npm install
npm run db:push
```

---

## 2️⃣ Cloud Storage Setup (Cloudinary)

### Step 1: Tạo tài khoản
1. Truy cập [cloudinary.com](https://cloudinary.com)
2. Đăng ký với Email
3. Xác minh email

### Step 2: Lấy API Keys
1. Dashboard → Settings → API Keys
2. Copy các giá trị:
   - Cloud Name: `abc123...`
   - API Key: `123456789...`
   - API Secret: `xxxyyy...`

### Step 3: Setup environment
```bash
# Backend .env
CLOUDINARY_CLOUD_NAME=abc123xyz
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=xxxyyyzz
```

---

## 3️⃣ Firebase Setup (Authentication)

### Step 1: Tạo Firebase Project
1. Truy cập [firebase.google.com](https://firebase.google.com)
2. Bấm "Go to console"
3. Create new project
4. Tên: `QLSV`
5. Enable Google Analytics (tuỳ chọn)

### Step 2: Setup Authentication
1. Project Settings → Service Accounts
2. Generate new private key (JSON)
3. Save file: `firebase-credentials.json`

### Step 3: Frontend Setup
1. Project Settings → Web App
2. Copy config object
3. Thêm vào `frontend/.env.local`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=qlsv-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=qlsv-xxx
VITE_FIREBASE_STORAGE_BUCKET=qlsv-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

### Step 4: Backend Setup
```bash
# Backend .env
FIREBASE_PROJECT_ID=qlsv-xxx
FIREBASE_PRIVATE_KEY=-----BEGIN...
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@qlsv-xxx.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://qlsv-xxx.firebaseio.com
```

---

## 4️⃣ Backend Deployment (Render.com)

### Step 1: Prepare Repository
```bash
# Ensure all code is committed
git add .
git commit -m "feat: restructure backend for deployment"
git push origin main
```

### Step 2: Create Render Service
1. Truy cập [render.com](https://render.com)
2. Bấm "New +" → "Web Service"
3. Chọn GitHub repository

### Step 3: Configure Build
```
Build Command: npm install && npm run build --prefix backend
Start Command: npm start --prefix backend
```

### Step 4: Set Environment Variables
```
SQL_HOST=neon-host.ap-southeast-1.aws.neon.tech
SQL_PORT=5432
SQL_DB_NAME=qlsv_db
SQL_ADMIN_USER=neondb_owner
SQL_ADMIN_PASSWORD=xxxxx
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend.vercel.app

CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

FIREBASE_PROJECT_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx
FIREBASE_DATABASE_URL=xxxxx
```

### Step 5: Deploy
1. Bấm "Create Web Service"
2. Chờ build hoàn thành (3-5 phút)
3. Copy URL: `https://qlsv-backend.onrender.com`

### Step 6: Update Frontend Config
```bash
# frontend/.env
VITE_API_BASE_URL=https://qlsv-backend.onrender.com/api
```

---

## 5️⃣ Frontend Deployment (Vercel)

### Step 1: Setup Vercel Project
1. Truy cập [vercel.com](https://vercel.com)
2. Bấm "New Project"
3. Import từ GitHub repository
4. Chọn framework: Next.js (hoặc Vite)

### Step 2: Configure Build
```
Framework: Vite
Build Command: npm run build --prefix frontend
Output Directory: frontend/dist
Install Command: npm install --prefix frontend
```

### Step 3: Set Environment Variables
```
VITE_API_BASE_URL=https://qlsv-backend.onrender.com/api
VITE_FIREBASE_API_KEY=xxxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxxx
VITE_FIREBASE_PROJECT_ID=xxxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx
```

### Step 4: Deploy
1. Bấm "Deploy"
2. Chờ build hoàn thành (2-3 phút)
3. Copy domain: `https://qlsv.vercel.app`

### Step 5: Update CORS in Backend
Cập nhật `CORS_ORIGIN` trên Render:
```
CORS_ORIGIN=https://qlsv.vercel.app
```

---

## 🔄 CI/CD Pipeline Setup

### Step 1: Configure GitHub Actions
File `.github/workflows/deploy.yml` đã tạo sẵn

### Step 2: Add Secrets to GitHub
1. Vào repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `RAILWAY_API_TOKEN` (nếu dùng Railway)
   - `RENDER_API_KEY` (nếu dùng Render)
   - `VERCEL_TOKEN`
   - `FIREBASE_PRIVATE_KEY`

### Step 3: Enable Auto-Deploy
- Mỗi push vào `main` branch tự động deploy

---

## 🔐 Security Checklist

- [ ] Thay đổi tất cả passwords/keys
- [ ] Enable HTTPS everywhere (tự động)
- [ ] Setup CORS properly
- [ ] Enable database backups
- [ ] Setup SSL certificates
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Setup monitoring & alerts
- [ ] Regular security updates

---

## ⚠️ Troubleshooting

### Backend Deploy Failed
```bash
# Check logs trên Render
# 1. Kiểm tra environment variables
# 2. Kiểm tra database connection
# 3. Kiểm tra Node.js version (>= 18)
```

### Frontend Deploy Failed
```bash
# Check build logs
# 1. Kiểm tra build command
# 2. Kiểm tra environment variables
# 3. Kiểm tra TypeScript errors
```

### Database Connection Timeout
```bash
# 1. Kiểm tra Neon connection string
# 2. Kiểm tra firewall settings
# 3. Test connection: psql <connection-string>
```

### CORS Errors
```bash
# Backend .env
CORS_ORIGIN=https://your-frontend-domain.com
```

---

## 📊 Monitoring & Logs

### Vercel Logs
- Dashboard → Deployments → View Logs
- Real-time logs available

### Render Logs
- Dashboard → Web Service → Logs
- Real-time logs available

### Database Logs
- Neon Dashboard → Logs
- Query performance monitoring

---

## 💰 Cost Estimation

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel  | Pro  | $20         |
| Render  | Starter | Free - $7  |
| Neon    | Starter | Free - $50 |
| Cloudinary | Basic | Free |
| Firebase | Spark | Free |
| **Total** | | **$20 - $77** |

---

## 🎯 Next Steps

1. ✅ Setup database (Neon.tech)
2. ✅ Setup storage (Cloudinary)
3. ✅ Setup authentication (Firebase)
4. ✅ Deploy backend (Render)
5. ✅ Deploy frontend (Vercel)
6. ✅ Setup CI/CD pipeline
7. ✅ Test all endpoints
8. ✅ Setup monitoring & alerts
9. ✅ Custom domain (optional)
10. ✅ SSL certificates (auto with Vercel/Render)

---

## 📞 Support

- Neon.tech: [docs.neon.tech](https://docs.neon.tech)
- Render: [render.com/docs](https://render.com/docs)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Firebase: [firebase.google.com/docs](https://firebase.google.com/docs)
- Cloudinary: [cloudinary.com/documentation](https://cloudinary.com/documentation)

---

Made with ❤️ for efficient deployment
