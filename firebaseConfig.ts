import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ Configuração correta para Firebase com Expo
const firebaseConfig = {
  apiKey: "AIzaSyDI9DfVhnqdJAB1o-OofqUkOorx6HxVzc8",
  authDomain: "metest-7faaa.firebaseapp.com",
  projectId: "metest-7faaa",
  storageBucket: "metest-7faaa.firebasestorage.app",
  messagingSenderId: "207196379514",
  appId: "1:207196379514:web:b0532b05f2250d8a3fdec3"
};

// Inicialize o app se ainda não estiver iniciado
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ⚠️ Use apenas getAuth(app), sem initializeAuth
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
