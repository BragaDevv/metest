import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from "react-native";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext"; // ajuste o caminho conforme seu projeto
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada" | "aguardando_assinatura";
  numeroOrdem?: string;
  assinatura?: string;
  fotosDepois?: string[];
  fotosAntes?: string[]; // ✅ novo campo
  observacoes?: string;
  criadoEm?: any; // ✅ início (timestamp Firebase)
  inicioExecucao?: any; // ✅ inicio Execução
  finalizadoEm?: any; // ✅ fim (timestamp Firebase)
  executadoPor?: string; // ✅ novo campo
}

export default function VisualizarOrdensScreen() {
  const { user, tipo, logout } = useAuth();
  const auth = getAuth();
  const isAdmin = tipo === "adm";
  const userEmail = auth.currentUser?.email;

  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<
    "pendente" | "em_execucao" | "todas"
  >("todas");
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string | null>(null);

  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null);
  const [modalFotoVisivel, setModalFotoVisivel] = useState(false);

  const [nome, setNome] = useState<string | null>(null);

  const fetchOrdens = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const lista = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Ordem))
        .filter(
          (ordem) =>
            ordem.status !== "finalizada" &&
            ordem.status !== "aguardando_assinatura"
        ); // 🔥 Oculta as duas
      setOrdens(lista);
    } catch (err) {
      console.error("Erro ao buscar ordens:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrdens();
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

  const excluirOrdem = async (id: string) => {
    Alert.alert("Confirmar", "Tem certeza que deseja excluir esta ordem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "ordens_servico", id));
            Alert.alert("Ordem excluída com sucesso");
            fetchOrdens();
          } catch (err) {
            console.error("Erro ao excluir:", err);
            Alert.alert("Erro ao excluir ordem");
          }
        },
      },
    ]);
  };

  const iniciarOrdem = async (id: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão de localização negada");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const ordemRef = doc(db, "ordens_servico", id);
      await updateDoc(ordemRef, {
        status: "em_execucao",
        inicioExecucao: serverTimestamp(),
        executadoPor: userEmail,
        executadoPorNome: nome, 
        localInicio: {
          latitude,
          longitude,
        },
      });

      Alert.alert("Ordem iniciada");
      fetchOrdens();
    } catch (err) {
      console.error(err);
      Alert.alert("Erro ao iniciar ordem");
    }
  };

  const toggleDetalhes = (id: string) => {
    setDetalhesVisiveis(detalhesVisiveis === id ? null : id);
  };

  const finalizarOrdem = (ordem: Ordem) => {
    navigation.navigate("FinalizarScreen", { ordemId: ordem.id });
  };

  const ordensFiltradas =
    filtroStatus === "todas"
      ? ordens
      : ordens.filter((ordem) => ordem.status === filtroStatus);

  const contar = (status: Ordem["status"]) =>
    ordens.filter((o) => o.status === status).length;

  const renderItem = ({ item }: { item: Ordem }) => (
    <View
      style={[
        styles.card,
        item.status === "em_execucao" && styles.cardExecucao,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.numeroOrdem}>Ordem nº {item.numeroOrdem}</Text>
        <TouchableOpacity onPress={() => toggleDetalhes(item.id)}>
          <Ionicons
            name={
              detalhesVisiveis === item.id
                ? "remove-circle-outline"
                : "add-circle-outline"
            }
            size={26}
            color="#007bff"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.titleCard}>
        {item.cliente} - {item.empresa}
      </Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {detalhesVisiveis === item.id && (
        <View style={styles.detalhesContainer}>
          <Text style={styles.label}>Descrição:</Text>
          <Text style={styles.valor}>{item.descricao}</Text>

          <Text style={styles.label}>Localização:</Text>
          <Text style={styles.valor}>{item.localizacao}</Text>

          {item.observacoes && (
            <>
              <Text style={styles.label}>Observações:</Text>
              <Text style={styles.valor}>{item.observacoes}</Text>
            </>
          )}

          {item.criadoEm && (
            <>
              <Text style={styles.label}>Aberta em:</Text>
              <Text style={styles.valor}>
                {new Date(item.criadoEm.seconds * 1000).toLocaleString("pt-BR")}
              </Text>
            </>
          )}

          {item.inicioExecucao && (
            <>
              <Text style={styles.label}>Início da Execução:</Text>
              <Text style={styles.valor}>
                {new Date(item.inicioExecucao.seconds * 1000).toLocaleString(
                  "pt-BR"
                )}
              </Text>
            </>
          )}

          {item.executadoPor && (
            <>
              <Text style={styles.label}>Executado por:</Text>
              <Text style={styles.valor}>{nome ? nome : user?.email}</Text>
            </>
          )}

          {Array.isArray(item.fotosAntes) && item.fotosAntes.length > 0 && (
            <>
              <Text style={styles.label}>
                Fotos relacionadas a Ordem #{item.numeroOrdem}{" "}
              </Text>
              <View style={styles.imagensContainer}>
                {item.fotosAntes.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setFotoSelecionada(url);
                      setModalFotoVisivel(true);
                    }}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.imagem}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {item.status === "pendente" && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => iniciarOrdem(item.id)}
            >
              <Text style={styles.buttonText}>Iniciar</Text>
            </TouchableOpacity>
          )}

          {item.status === "em_execucao" && (
            <TouchableOpacity
              style={styles.finalizarButton}
              onPress={() => finalizarOrdem(item)}
            >
              <Text style={styles.buttonText}>Finalizar</Text>
            </TouchableOpacity>
          )}

          {isAdmin && (
            <TouchableOpacity
              style={styles.trashButton}
              onPress={() => excluirOrdem(item.id)}
            >
              <Ionicons name="trash" size={22} color="#e74c3c" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ordens de Serviço</Text>
      <View style={styles.filtros}>
        <TouchableOpacity
          style={[
            styles.filtroBotao,
            filtroStatus === "todas" && styles.filtroAtivo,
          ]}
          onPress={() => setFiltroStatus("todas")}
        >
          <Text style={styles.filtroTexto}>Todas ({ordens.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroBotao,
            filtroStatus === "pendente" && styles.filtroAtivo,
          ]}
          onPress={() => setFiltroStatus("pendente")}
        >
          <Text style={styles.filtroTexto}>
            Pendentes ({contar("pendente")})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroBotao,
            filtroStatus === "em_execucao" && styles.filtroAtivo,
          ]}
          onPress={() => setFiltroStatus("em_execucao")}
        >
          <Text style={styles.filtroTexto}>
            Em Execução ({contar("em_execucao")})
          </Text>
        </TouchableOpacity>
      </View>

      {ordensFiltradas.length === 0 ? (
        <View style={styles.semOrdensContainer}>
          <Text style={styles.semOrdensTexto}>
            📭 Nenhuma ordem no momento.
          </Text>
        </View>
      ) : (
        <FlatList
          data={ordensFiltradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      )}

      {modalFotoVisivel && fotoSelecionada && (
        <Modal visible={modalFotoVisivel} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 90,
                right: 30,
                backgroundColor: "#e74c3c",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              onPress={() => {
                setModalFotoVisivel(false);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
            </TouchableOpacity>

            <Image
              source={{ uri: fotoSelecionada }}
              style={{ width: "90%", height: "70%", borderRadius: 10 }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardExecucao: {
    backgroundColor: "#e6f9ec",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  numeroOrdem: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#555",
  },
  titleCard: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 12,
  },
  detalhesContainer: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  label: {
    marginTop: 10,
    fontWeight: "bold",
    color: "#333",
  },
  valor: {
    color: "#444",
    marginTop: 2,
  },
  imagensContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  imagem: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#007bff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  finalizarButton: {
    marginTop: 16,
    backgroundColor: "#28a745",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  trashButton: {
    position: "absolute",
    top: -50,
    right: -5,
    padding: 6,
  },
  filtros: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 2,
  },
  filtroBotao: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ccc",
    borderRadius: 8,
  },
  filtroAtivo: {
    backgroundColor: "#007bff",
  },
  filtroTexto: {
    color: "#fff",
    fontWeight: "bold",
  },
  semOrdensContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  semOrdensTexto: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
  },
});
