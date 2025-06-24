import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import { getAuth } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada";
  numeroOrdem?: string;
}

export default function VisualizarOrdensScreen() {
  const auth = getAuth();
  const userEmail = auth.currentUser?.email;
  const isAdmin = userEmail === "admin@metest.com";

  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<"pendente" | "em_execucao" | "finalizada" | "todas">("todas");
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fetchOrdens = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const lista = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Ordem));
      setOrdens(lista);
    } catch (err) {
      console.error("Erro ao buscar ordens:", err);
    }
  };

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
      const ordemRef = doc(db, "ordens_servico", id);
      await updateDoc(ordemRef, { status: "em_execucao" });
      Alert.alert("Ordem iniciada");
      fetchOrdens();
    } catch (err) {
      Alert.alert("Erro ao iniciar ordem");
    }
  };

  const finalizarOrdem = (ordem: Ordem) => {
    navigation.navigate("FinalizarScreen", { ordemId: ordem.id });
  };

  useEffect(() => {
    fetchOrdens();
  }, []);

  const ordensFiltradas = filtroStatus === "todas"
    ? ordens
    : ordens.filter((ordem) => ordem.status === filtroStatus);

  const contar = (status: Ordem["status"]) => ordens.filter((o) => o.status === status).length;

  const renderItem = ({ item }: { item: Ordem }) => (
    <View style={[styles.card, item.status === "em_execucao" && styles.cardExecucao]}>
      {item.numeroOrdem && (
        <Text style={styles.numeroOrdem}>Ordem nº {item.numeroOrdem}</Text>
      )}
      <Text style={styles.title}>{item.cliente} - {item.empresa}</Text>
      <Text>{item.descricao}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {item.status === "pendente" && (
        <TouchableOpacity style={styles.button} onPress={() => iniciarOrdem(item.id)}>
          <Text style={styles.buttonText}>Iniciar</Text>
        </TouchableOpacity>
      )}

      {item.status === "em_execucao" && (
        <TouchableOpacity style={styles.finalizarButton} onPress={() => finalizarOrdem(item)}>
          <Text style={styles.buttonText}>Finalizar</Text>
        </TouchableOpacity>
      )}

      {isAdmin && (
        <TouchableOpacity style={styles.trashButton} onPress={() => excluirOrdem(item.id)}>
          <Ionicons name="trash" size={20} color="#e74c3c" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        <TouchableOpacity
          style={[styles.filtroBotao, filtroStatus === "todas" && styles.filtroAtivo]}
          onPress={() => setFiltroStatus("todas")}
        >
          <Text style={styles.filtroTexto}>Todas ({ordens.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBotao, filtroStatus === "pendente" && styles.filtroAtivo]}
          onPress={() => setFiltroStatus("pendente")}
        >
          <Text style={styles.filtroTexto}>Pendentes ({contar("pendente")})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBotao, filtroStatus === "em_execucao" && styles.filtroAtivo]}
          onPress={() => setFiltroStatus("em_execucao")}
        >
          <Text style={styles.filtroTexto}>Em Execução ({contar("em_execucao")})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBotao, filtroStatus === "finalizada" && styles.filtroAtivo]}
          onPress={() => setFiltroStatus("finalizada")}
        >
          <Text style={styles.filtroTexto}>Finalizadas ({contar("finalizada")})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={ordensFiltradas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  cardExecucao: {
    backgroundColor: "#e6f9ec",
  },
  numeroOrdem: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  status: {
    marginTop: 8,
    fontWeight: "bold",
    color: "#555",
  },
  button: {
    marginTop: 12,
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  finalizarButton: {
    marginTop: 12,
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  trashButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 6,
  },
  filtros: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
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
});
