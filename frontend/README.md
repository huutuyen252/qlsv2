# 🎨 Frontend - QLSV

Frontend application cho hệ thống quản lý sinh viên.

## 📦 Tech Stack

- **React 19** - UI library
- **Vite 6** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Authentication

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── admin/          # Admin modules
│   ├── common/         # Shared components
│   ├── grades/         # Grade management
│   ├── schedule/       # Schedule management
│   └── ...
├── config/             # Configuration
│   └── menu.config.ts  # Menu configuration
├── context/            # React Context
│   └── ThemeContext.tsx
├── data/               # Static data
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## ⚙️ Environment Variables

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## 🔌 API Communication

Frontend communicates with backend at:
- Development: `http://localhost:3000/api`
- Production: `https://your-backend-domain.com/api`

Configured in `vite.config.ts` with proxy.

## 🚢 Deployment

### Vercel

1. Connect GitHub repository
2. Set build command: `npm run build --prefix frontend`
3. Set output directory: `frontend/dist`
4. Add environment variables
5. Deploy

See [DEPLOYMENT.md](../DEPLOYMENT.md) for details.

## 📝 Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run TypeScript check

## 🔍 Quality

- TypeScript for type safety
- ESLint configured
- Responsive design with Tailwind CSS

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Firebase Docs](https://firebase.google.com/docs)

---

For full project documentation, see [README.md](../README.md)
