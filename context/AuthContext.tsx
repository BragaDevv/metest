import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// METEST: controla usuários por tipo ('adm' ou 'funcionario') salvo no Firestore

type AuthContextType = {
  user: User | null;
  tipo: 'adm' | 'funcionario' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tipo, setTipo] = useState<'adm' | 'funcionario' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const docRef = doc(db, "usuarios", firebaseUser.uid);
          const snap = await getDoc(docRef);
          const userTipo = snap.exists() ? snap.data()?.tipo : null;
          setTipo(userTipo);
          console.log(`👤 ${firebaseUser.email} | Tipo: ${userTipo}`);
        } catch (error) {
          console.warn("⚠️ Erro ao buscar tipo do usuário:", error);
          setTipo(null);
        }
      } else {
        setTipo(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setTipo(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, tipo, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
