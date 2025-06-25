import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: "adm" | "funcionario";
};

export default function AdminPainelScreen() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);

  const buscarUsuarios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "usuarios"));
      const lista: Usuario[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        nome: docSnap.data().nome,
        email: docSnap.data().email,
        tipo: docSnap.data().tipo || "funcionario",
      }));
      setUsuarios(lista);
    } catch (error) {
      Alert.alert("Erro ao buscar usuários");
    } finally {
      setCarregando(false);
    }
  };

  const alternarTipo = async (usuario: Usuario) => {
    const novoTipo = usuario.tipo === "adm" ? "funcionario" : "adm";

    try {
      await updateDoc(doc(db, "usuarios", usuario.id), {
        tipo: novoTipo,
      });
      Alert.alert(
        "Alterado com sucesso",
        `${usuario.nome} agora é ${novoTipo}`
      );
      buscarUsuarios();
    } catch (error) {
      Alert.alert("Erro ao atualizar usuário");
    }
  };

  useEffect(() => {
    buscarUsuarios();
  }, []);

  const renderItem = ({ item }: { item: Usuario }) => (
    <View style={styles.card}>
      <View style={styles.infoContainer}>
        <Text style={styles.nome}>{item.nome}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.tipo}>
          Tipo: <Text style={{ fontWeight: "bold" }}>{item.tipo}</Text>
        </Text>
      </View>
      <TouchableOpacity style={styles.botao} onPress={() => alternarTipo(item)}>
        <Text style={styles.botaoTexto}>
          {item.tipo === "adm" ? "Rebaixar" : "Promover"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel de Administração</Text>

      {carregando ? (
        <Text>🔄 Carregando usuários...</Text>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f9fc",
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
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    marginRight: 10,
  },
  nome: {
    fontSize: 16,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    color: "#555",
    marginVertical: 4,
  },
  tipo: {
    fontSize: 14,
    color: "#333",
  },
  botao: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
  },
});
