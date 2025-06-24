import React, { useState } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Image, FlatList
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection, addDoc, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import * as ImagePicker from "expo-image-picker";

export default function AbrirOrdemServicoScreen() {
  const [cliente, setCliente] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const gerarNumeroOrdem = async (): Promise<string> => {
    const controleRef = doc(db, "controle_ordens", "contador");
    const snap = await getDoc(controleRef);

    let novoNumero = 1;

    if (snap.exists()) {
      const data = snap.data();
      novoNumero = data.ultimoNumero + 1;
      await updateDoc(controleRef, { ultimoNumero: increment(1) });
    } else {
      await setDoc(controleRef, { ultimoNumero: 1 });
    }

    return String(novoNumero).padStart(4, "0");
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });

    if (!result.canceled && result.assets.length > 0) {
      setFotos([...fotos, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (uri: string) => {
    setFotos((prev) => prev.filter((foto) => foto !== uri));
  };

  const handleSubmit = async () => {
    if (!cliente || !empresa || !descricao || !localizacao) {
      Alert.alert("Preencha todos os campos");
      return;
    }

    try {
      const numeroOrdem = await gerarNumeroOrdem();

      await addDoc(collection(db, "ordens_servico"), {
        numeroOrdem,
        cliente,
        empresa,
        descricao,
        localizacao,
        fotos,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });

      Alert.alert(`Ordem n° ${numeroOrdem} criada com sucesso!`);
      setCliente("");
      setEmpresa("");
      setDescricao("");
      setLocalizacao("");
      setFotos([]);
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao criar ordem:", error);
      Alert.alert("Erro ao salvar a ordem");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require("../assets/images/icon.png")} style={styles.bgLogo} />
      <Text style={styles.title}>Nova Ordem de Serviço</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome do Cliente"
        value={cliente}
        onChangeText={setCliente}
      />

      <TextInput
        style={styles.input}
        placeholder="Empresa"
        value={empresa}
        onChangeText={setEmpresa}
      />

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Descrição do Serviço"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <TextInput
        style={styles.input}
        placeholder="Localização (GPS ou Endereço)"
        value={localizacao}
        onChangeText={setLocalizacao}
      />

      <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
        <MaterialIcons name="photo-camera" size={22} color="#fff" />
        <Text style={styles.imageButtonText}>Adicionar Foto</Text>
      </TouchableOpacity>

      <FlatList
        data={fotos}
        horizontal
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: item }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImage} onPress={() => handleRemoveImage(item)}>
              <Ionicons name="close-circle" size={22} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Ionicons name="save-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Salvar Ordem</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9f9f9",
    flexGrow: 1,
    position: "relative",
  },
  bgLogo: {
    position: "absolute",
    opacity: 0.06,
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    elevation: 2,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e86de",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    justifyContent: "center",
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    marginRight: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImage: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 2,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    justifyContent: "center",
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
