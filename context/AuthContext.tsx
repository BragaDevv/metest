import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

type TipoUsuario = "adm" | "funcionario";

type AuthContextType = {
  user: User | null;
  tipo: TipoUsuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [tipo, setTipo] = useState<TipoUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const tipoFoiCarregadoNoLogin = useRef(false);

  const isTipoValido = (value: any): value is TipoUsuario => {
    return value === "adm" || value === "funcionario";
  };

  // ⏬ Listener do Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setTipo(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      if (tipoFoiCarregadoNoLogin.current) {
        setLoading(false);
        return;
      }

      let tentativas = 0;
      const maxTentativas = 5;

      while (tentativas < maxTentativas) {
        try {
          const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          const data = snap.data();
          const rawTipo = data?.tipo;

          console.log(`📦 Tentativa ${tentativas + 1}:`, data);

          if (isTipoValido(rawTipo)) {
            setTipo(rawTipo);
            console.log(`👤 Tipo detectado automaticamente: ${rawTipo}`);
            break;
          }

          tentativas++;
          await new Promise((resolve) => setTimeout(resolve, 1000)); // espera 1s antes de tentar de novo
        } catch (error) {
          console.warn("⚠️ Erro ao buscar tipo do usuário:", error);
          break;
        }
      }

      if (!tipo) {
        console.warn(
          "⚠️ Não foi possível detectar o tipo após múltiplas tentativas"
        );
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    console.log("🔄 Loading:", loading, "| Tipo:", tipo);
  }, [loading, tipo]);

  // ⏬ Login manual
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;

      // ✅ Pequeno delay para garantir propagação do Firestore
      await new Promise((resolve) => setTimeout(resolve, 500));

      const snap = await getDoc(doc(db, "usuarios", uid));
      const data = snap.data();

      console.log("📦 Dados do usuário (login):", data);

      const rawTipo = data?.tipo;

      setUser(result.user);

      if (isTipoValido(rawTipo)) {
        setTipo(rawTipo);
        tipoFoiCarregadoNoLogin.current = true;
        console.log(`✅ Tipo carregado manualmente: ${rawTipo}`);
      } else {
        setTipo(null);
        console.warn("⚠️ Tipo inválido encontrado no login:", rawTipo);
      }
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
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
      tipoFoiCarregadoNoLogin.current = false;
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
