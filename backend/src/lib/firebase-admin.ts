import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let adminApp: admin.app.App;
let adminAuth: admin.auth.Auth;
let adminDatabase: admin.database.Database;

export function initializeFirebaseAdmin() {
  try {
    const serviceAccountPath = process.env.FIREBASE_CREDENTIALS_PATH || 
      path.join(__dirname, '../../firebase-credentials.json');

    const serviceAccount = require(serviceAccountPath);

    if (!adminApp) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });

      adminAuth = admin.auth(adminApp);
      adminDatabase = admin.database(adminApp);
    }

    console.log('[Firebase] Admin SDK initialized');
  } catch (error) {
    console.error('[Firebase] Failed to initialize admin SDK:', error);
    throw error;
  }
}

export function getFirebaseAuth() {
  if (!adminAuth) {
    initializeFirebaseAdmin();
  }
  return adminAuth;
}

export function getFirebaseDatabase() {
  if (!adminDatabase) {
    initializeFirebaseAdmin();
  }
  return adminDatabase;
}
