import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Modal,
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

  const [modalVisible, setModalVisible] = useState(false);

  const fecharModal = () => setModalVisible(false);

  const opcoes = [
    { label: "Ordem de Serviço de Manutenção", tela: "OrdemScreen" },
    { label: "Relatório Fotográfico de Serviço", tela: "RelatorioFotograficoScreen" },
    { label: "Check List de Manutenção Preventiva", tela: "ChecklistManutencaoScreen" },
    { label: "PMOC - Plano de Manutenção, Operação e Controle", tela: "PMOCScreen" },
    { label: "Relatório de Visita Técnica", tela: "VisitaTecnicaScreen" },
  ] as const;
  ;



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
    logout(); // Isso limpa o user e tipo no contexto
  };

  const verificarOrdens = async () => {
    try {
      const colecoes = [
        "ordens_servico",
        "relatorios_fotograficos",
        "checklists_manutencao",
        "pmocs",
        "visitas_tecnicas",
      ];

      let todasOrdens: any[] = [];

      for (const nomeColecao of colecoes) {
        const snapshot = await getDocs(collection(db, nomeColecao));
        const ordens = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            status: (data.status || "").toString().trim().toLowerCase(),
          };
        });

        todasOrdens.push(...ordens);
      }

      const pendentes = todasOrdens.some((o) => o.status === "pendente");
      const aguardandoAssinatura = todasOrdens.some(
        (o) => o.status === "aguardando_assinatura"
      );

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
      {tipo === "adm" && (
        <TouchableOpacity
          style={styles.botaoCadastroCliente}
          onPress={() => navigation.navigate("CadastroClienteScreen")}
        >
          <Ionicons name="bookmark" size={28} color="#333" />
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
            style={styles.menuButtonAbrir}
            onPress={() => setModalVisible(true)}

          >
            <Ionicons
              name="add-circle-outline"
              size={28}
              color="#fff"
              style={styles.icon}
            />
            <Text style={styles.menuText}>Criar Atividade</Text>
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
          <Text style={styles.menuText}>Pendentes / Execução</Text>
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
          <Text style={styles.menuText}>Finalizadas</Text>
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Tipo de Atividade</Text>

            {opcoes.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalButton}
                onPress={() => {
                  fecharModal();
                  navigation.navigate(item.tela); // ✅ Agora o TypeScript aceita
                }}
              >
                <Text style={styles.modalButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}



            <TouchableOpacity onPress={fecharModal} style={styles.fecharButton}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  botaoCadastroCliente: {
    position: "absolute",
    top: Platform.OS === "web" ? 30 : 60,
    left: Platform.OS === "web" ? '80%' : undefined,
    right: Platform.OS === "web" ? undefined : 80,
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
  menuButtonAbrir: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#28a745",
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 6,
    width: "100%",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  fecharButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#e74c3c",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },

});
