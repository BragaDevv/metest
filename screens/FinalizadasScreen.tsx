import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada";
  numeroOrdem?: string;
}

export default function OrdensFinalizadasScreen() {
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<Ordem[]>([]);
  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string | null>(null);

  const fetchOrdensFinalizadas = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const finalizadas = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Ordem))
        .filter((ordem) => ordem.status === "finalizada");
      setOrdensFinalizadas(finalizadas);
    } catch (err) {
      console.error("Erro ao buscar ordens finalizadas:", err);
    }
  };

  const gerarPDF = async (ordem: Ordem) => {
    const htmlContent = `
      <html>
        <body>
          <h1>Ordem de Serviço Nº ${ordem.numeroOrdem}</h1>
          <p><strong>Cliente:</strong> ${ordem.cliente}</p>
          <p><strong>Empresa:</strong> ${ordem.empresa}</p>
          <p><strong>Localização:</strong> ${ordem.localizacao}</p>
          <p><strong>Descrição:</strong> ${ordem.descricao}</p>
          <p><strong>Status:</strong> ${ordem.status}</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri);
  };

  const toggleDetalhes = (id: string) => {
    setDetalhesVisiveis(detalhesVisiveis === id ? null : id);
  };

  useEffect(() => {
    fetchOrdensFinalizadas();
  }, []);

  const renderItem = ({ item }: { item: Ordem }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.numeroOrdem}>Ordem nº {item.numeroOrdem}</Text>
        <TouchableOpacity onPress={() => toggleDetalhes(item.id)}>
          <Ionicons
            name={detalhesVisiveis === item.id ? "remove-circle-outline" : "add-circle-outline"}
            size={24}
            color="#007bff"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{item.cliente} - {item.empresa}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {detalhesVisiveis === item.id && (
        <View style={{ marginTop: 8 }}>
          <Text><Text style={styles.label}>Descrição:</Text> {item.descricao}</Text>
          <Text><Text style={styles.label}>Localização:</Text> {item.localizacao}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.pdfButton} onPress={() => gerarPDF(item)}>
        <Ionicons name="document" size={18} color="#fff" />
        <Text style={styles.buttonText}>Gerar PDF</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={ordensFinalizadas}
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
  pdfButton: {
    marginTop: 12,
    backgroundColor: "#6c63ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  label: {
    fontWeight: "bold",
    color: "#333",
  },
});
