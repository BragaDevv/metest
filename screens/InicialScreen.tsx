import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function TelaInicial() {
  const { user, tipo, loading, logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [temPendentes, setTemPendentes] = useState(false);
  const [temAssinaturasPendentes, setTemAssinaturasPendentes] = useState(false);
  const [nome, setNome] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      verificarOrdens();
    }, [])
  );

  useEffect(() => {
    const carregarNome = async () => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          if (snap.exists()) {
            const dados = snap.data();
            setNome(dados?.nome || null);
            console.log(`👤 Logado como ${dados?.nome}`);
          }
        } catch (err) {
          console.warn("Erro ao buscar nome do usuário:", err);
        }
      }
    };
    carregarNome();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
  };

  const verificarOrdens = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const ordens = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          status: (data.status || "").toString().trim().toLowerCase(),
        };
      });

      const pendentes =
        ordens.filter((o) => o.status === "pendente").length > 0;
      const aguardandoAssinatura =
        ordens.filter((o) => o.status === "aguardando_assinatura").length > 0;

      setTemPendentes(pendentes);
      setTemAssinaturasPendentes(aguardandoAssinatura);
    } catch (error) {
      console.error("Erro ao verificar ordens:", error);
    }
  };

  return (
    <View style={styles.container}>
      {tipo === "adm" && (
        <TouchableOpacity
          style={styles.botaoCadastro}
          onPress={() => navigation.navigate("CadastroScreen")}
        >
          <Ionicons name="person-add-outline" size={28} color="#333" />
        </TouchableOpacity>
      )}
      <Image
        source={require("../assets/images/logo-metest.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Bem-vindo à METEST</Text>
      <Text style={styles.info}>Olá, {nome ? nome : user?.email}</Text>

      <View style={styles.menu}>
        {tipo === "adm" && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate("OrdemScreen")}
          >
            <Ionicons
              name="add-circle-outline"
              size={28}
              color="#fff"
              style={styles.icon}
            />
            <Text style={styles.menuText}>Abrir Ordem de Serviço</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("VisualizarScreen")}
        >
          <Ionicons
            name="document-text-outline"
            size={28}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.menuText}>OS Pendentes / Execução</Text>
          {temPendentes && <View style={styles.notificacao} />}
        </TouchableOpacity>

        {tipo === "adm" && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => navigation.navigate("AssinaturaScreen")}
          >
            <Ionicons
              name="pencil"
              size={28}
              color="#fff"
              style={styles.icon}
            />
            <Text style={styles.menuText}>Aguardando Assinatura</Text>
            {temAssinaturasPendentes && <View style={styles.notificacao} />}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("FinalizadasScreen")}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={28}
            color="#3ff"
            style={styles.icon}
          />
          <Text style={styles.menuText}>OS Finalizadas</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: Platform.OS === "web" ? "center" : "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 20,
    ...(Platform.OS === "web" && {
      width: "100%",
      height: "100%", // força ocupar a altura da janela inteira
      maxWidth: "100%",
      alignSelf: "center",
      minHeight: "100%",
      paddingTop: 0,
      backgroundColor: "#fff", // cor exclusiva para Web
      backgroundImage: "url('/bg.jpg')",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
    }),
  },
  logo: {
    width: Platform.OS === "web" ? 520 : 280,
    height: Platform.OS === "web" ? 420 : 200,
    marginBottom: 10,
    marginTop: Platform.OS === "web" ? "-10%" : "-20%",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
    ...(Platform.OS === "web" && {
      position: "relative",
      bottom: "10%",
    }),
  },
  info: {
    fontSize: 18,
    marginBottom: 15,
    color: "#555",
    textAlign: "center",
    ...(Platform.OS === "web" && {
      position: "relative",
      bottom: "10%",
    }),
  },
  botaoCadastro: {
    position: "absolute",
    top: Platform.OS === "web" ? 30 : 60,
    left: Platform.OS === "web" ? '85%' : undefined,
    right: Platform.OS === "web" ? undefined : 20,
    zIndex: 999,
    padding: 8,
    backgroundColor: "#ffffffcc",
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
  },

  menu: {
    marginTop: 30,
    width: "100%",
    alignItems: "center",
    ...(Platform.OS === "web" && {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 30,
    }),
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    ...(Platform.OS === "web" && {
      width: 250,
      height: 120,
      justifyContent: "center",
      flexDirection: "column",
      gap: 10,
      marginVertical: 0,
    }),
  },

  menuText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
  },

  icon: {
    marginRight: 12,
  },
  logoutButton: {
    position: Platform.OS === "web" ? "absolute" : "absolute",
    top: Platform.OS === "web" ? 30 : undefined,
    left: Platform.OS === "web" ? '90%' : undefined, // distância ao lado do "Usuários"
    bottom: Platform.OS === "web" ? undefined : 70,
    flexDirection: "row",
    alignItems: "center",
    marginTop: Platform.OS === "web" ? 0 : 50,
    backgroundColor: "#e6501e",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  notificacao: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "red",
    position: "absolute",
    top: 8,
    right: 10,
  },
});
