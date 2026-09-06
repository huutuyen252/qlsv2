import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp;

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
    } else if (projectId) {
      // Khởi tạo chế độ projectId mặc định
      adminApp = initializeApp({
        projectId,
      });
    }
    return adminApp;
  } catch (error) {
    console.warn('[Firebase Admin] Khởi tạo Firebase Admin: ', error);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  if (adminAuthInstance) return adminAuthInstance;
  const app = getFirebaseAdminApp();
  if (app) {
    try {
      adminAuthInstance = getAuth(app);
      return adminAuthInstance;
    } catch (e) {
      console.warn('[Firebase Admin Auth Warning]', e);
    }
  }
  return null;
}

export function getAdminFirestore(): Firestore | null {
  if (adminDbInstance) return adminDbInstance;
  const app = getFirebaseAdminApp();
  if (app) {
    try {
      adminDbInstance = getFirestore(app);
      return adminDbInstance;
    } catch (e) {
      console.warn('[Firebase Admin Firestore Warning]', e);
    }
  }
  return null;
}

export const adminAuth = getAdminAuth();
export const adminDb = getAdminFirestore();
