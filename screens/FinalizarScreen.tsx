import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import * as ImagePicker from "expo-image-picker";
import SignatureScreen from "react-native-signature-canvas";

interface RouteParams {
  ordemId: string;
}

const CLOUD_NAME = "dy48gdjlv";
const UPLOAD_PRESET = "metest_unsigned";

export default function FinalizarOrdemScreen() {
  const route = useRoute();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { ordemId } = route.params as RouteParams;

  const [descricaoFinal, setDescricaoFinal] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [assinatura, setAssinatura] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const signatureRef = useRef<any>(null);

  const handleFinalizar = async () => {
    if (!descricaoFinal || !responsavel || !assinatura) {
      Alert.alert("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      await updateDoc(doc(db, "ordens_servico", ordemId), {
        status: "finalizada",
        descricaoFinal,
        observacoes,
        fotos,
        responsavel,
        assinatura,
        finalizadoEm: serverTimestamp(),
      });
      Alert.alert("Ordem finalizada com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao finalizar ordem:", err);
      Alert.alert("Erro ao finalizar a ordem.");
    }
  };

  const escolherFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const novasFotos: string[] = [];

      for (const asset of result.assets) {
        const formData = new FormData();
        formData.append("file", {
          uri: asset.uri,
          name: "foto.jpg",
          type: "image/jpeg",
        } as any);
        formData.append("upload_preset", UPLOAD_PRESET);

        try {
          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            {
              method: "POST",
              body: formData,
            }
          );
          const data = await response.json();
          if (data.secure_url) {
            novasFotos.push(data.secure_url);
          }
        } catch (error) {
          console.error("Erro ao subir imagem:", error);
        }
      }

      setFotos((prev) => [...prev, ...novasFotos]);
    }
  };

  const removerFoto = (index: number) => {
    const novas = [...fotos];
    novas.splice(index, 1);
    setFotos(novas);
  };

  const handleSignature = (signature: string) => {
    setAssinatura(signature);
    setShowSignature(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Finalizar Ordem de Serviço</Text>

      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Descrição do serviço executado"
        value={descricaoFinal}
        onChangeText={setDescricaoFinal}
        multiline
      />

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Observações (opcional)"
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
      />

      <TouchableOpacity style={styles.addPhotoButton} onPress={escolherFoto}>
        <Text style={styles.buttonText}>Selecionar Fotos</Text>
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 10 }}
      >
        {fotos.map((uri, index) => (
          <View key={index} style={{ position: "relative", marginRight: 10 }}>
            <Image source={{ uri }} style={styles.foto} />
            <TouchableOpacity
              onPress={() => removerFoto(index)}
              style={styles.removerBotao}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TextInput
        style={styles.input}
        placeholder="Nome do Responsável"
        value={responsavel}
        onChangeText={setResponsavel}
      />

      {!assinatura && (
        <TouchableOpacity
          style={styles.assinaturaButton}
          onPress={() => setShowSignature(true)}
        >
          <Text style={styles.buttonText}>Capturar Assinatura</Text>
        </TouchableOpacity>
      )}

      {assinatura ? (
        <Image source={{ uri: assinatura }} style={styles.assinaturaPreview} />
      ) : null}

      <Modal visible={showSignature} animationType="slide">
        <View style={{ flex: 1 }}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={() => setShowSignature(false)}
            descriptionText="Assine abaixo"
            clearText="Limpar"
            confirmText="Salvar"
            webStyle={".m-signature-pad {box-shadow: none; border: none;}"}
          />
          <TouchableOpacity
            onPress={() => setShowSignature(false)}
            style={{
              position: "absolute",
              top: 40,
              right: 20,
              backgroundColor: "#e74c3c",
              padding: 10,
              borderRadius: 8,
              zIndex: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <TouchableOpacity style={styles.button} onPress={handleFinalizar}>
        <Text style={styles.buttonText}>Finalizar Ordem</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f0f0f0",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  addPhotoButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  foto: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removerBotao: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#e74c3c",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  assinaturaButton: {
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  assinaturaPreview: {
    height: 120,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
  },
});
