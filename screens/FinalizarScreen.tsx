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
  ActivityIndicator,
  ImageBackground,
  Platform,
} from "react-native";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import * as ImagePicker from "expo-image-picker";
import SignatureScreen from "react-native-signature-canvas";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";


interface RouteParams {
  ordemId: string;
}

type FotoInfo = {
  url: string;
  latitude: number;
  longitude: number;
  timestamp: number;
};

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
  const [showSignature, setShowSignature] = useState(false);
  const signatureRef = useRef<any>(null);

  const [fotos, setFotos] = useState<FotoInfo[]>([]);
  const [carregandoFoto, setCarregandoFoto] = useState(false);

  const [finalizando, setFinalizando] = useState(false);


  const handleFinalizar = async () => {
    if (!descricaoFinal || !responsavel || !assinatura) {
      Alert.alert("Preencha todos os campos obrigatórios.");
      return;
    }

    setFinalizando(true);

    try {
      await updateDoc(doc(db, "ordens_servico", ordemId), {
        status: "aguardando_assinatura",
        descricaoFinal,
        observacoes,
        fotosDepois: fotos,
        responsavel,
        assinatura_cliente: assinatura,
        finalizadoEm: serverTimestamp(),
      });

      await fetch("https://metest-backend.onrender.com/api/send-to-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ordemId }),
      });

      Alert.alert("Ordem finalizada com sucesso!");
      navigation.goBack();
    } catch (err) {
      console.error("Erro ao finalizar ordem:", err);
      Alert.alert("Erro ao finalizar a ordem.");
    } finally {
      setFinalizando(false);
    }
  };


  const escolherFoto = async () => {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const locationPerm = await Location.requestForegroundPermissionsAsync();

    if (!cameraPerm.granted || !locationPerm.granted) {
      Alert.alert(
        "Permissões necessárias",
        "Permita acesso à câmera e localização."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setCarregandoFoto(true); // começa loading

      try {
        const asset = result.assets[0];
        console.log("📷 Foto capturada:", asset.uri);

        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        console.log("🛠️ Foto redimensionada:", manipResult.uri);

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const timestamp = Date.now();

        const formData = new FormData();
        formData.append("file", {
          uri: manipResult.uri,
          name: "foto.jpg",
          type: "image/jpeg",
        } as any);
        formData.append("upload_preset", UPLOAD_PRESET);

        console.log("☁️ Enviando para Cloudinary...");

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data = await response.json();

        if (data.secure_url) {
          console.log("✅ Imagem enviada:", data.secure_url);

          const novaFoto: FotoInfo = {
            url: data.secure_url,
            latitude,
            longitude,
            timestamp,
          };
          setFotos((prev) => [...prev, novaFoto]);
          Alert.alert("Imagem enviada com sucesso!");
        } else {
          console.error("❌ Erro ao receber URL segura:", data);
          Alert.alert("Erro ao processar imagem.");
        }
      } catch (error) {
        console.error("❌ Erro geral ao enviar imagem:", error);
        Alert.alert("Erro ao enviar imagem.");
      } finally {
        setCarregandoFoto(false); // termina loading
      }
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
    <ImageBackground
      source={require("../assets/images/bgAll.jpg")}
      style={styles.container}
      resizeMode="stretch"
    >
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.title}>Finalizar Ordem de Serviço</Text>

        <Text style={styles.label}>Descrição do Serviço:</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Descrição do serviço executado"
          placeholderTextColor="#ccc"
          value={descricaoFinal}
          onChangeText={setDescricaoFinal}
          multiline
        />
        <Text style={styles.label}>Observações:</Text>
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Observações (opcional)"
          placeholderTextColor="#ccc"
          value={observacoes}
          onChangeText={setObservacoes}
          multiline
        />
        <Text style={styles.label}>Responsável:</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do Responsável"
          placeholderTextColor="#ccc"
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

        <Modal visible={showSignature} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "90%",
                height: "50%",
                backgroundColor: "white",
                borderRadius: 12,
                overflow: "hidden",
                ...(Platform.OS === "web"
                  ? {
                    width: "30%",
                    height: "70%",
                  }
                  : {}),
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#007bff",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                  ✍️ Assine abaixo
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSignature(false)}
                  style={{
                    backgroundColor: "#dc3545",
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
                </TouchableOpacity>
              </View>

              <SignatureScreen
                ref={signatureRef}
                onOK={(result) => {
                  handleSignature(result);
                }}
                onEmpty={() => Alert.alert("Assinatura vazia")}
                descriptionText=""
                clearText="Limpar"
                confirmText="Salvar"
              />
            </View>
          </View>
        </Modal>


        <TouchableOpacity style={styles.addPhotoButton} onPress={escolherFoto}>
          <Text style={styles.buttonText}>Tirar Foto</Text>
        </TouchableOpacity>
        {carregandoFoto && (
          <View style={{ marginVertical: 10 }}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={{ textAlign: "center", color: "#007bff", marginTop: 5 }}>
              Enviando foto...
            </Text>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
        >
          {fotos.map((foto, index) => (
            <View key={index} style={{ position: "relative", marginRight: 15 }}>
              <Image source={{ uri: foto.url }} style={styles.foto} />
              <TouchableOpacity
                onPress={() => removerFoto(index)}
                style={styles.removerBotao}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                📍 {foto.latitude.toFixed(5)}, {foto.longitude.toFixed(5)}
              </Text>
              <Text style={{ fontSize: 10, color: "#777" }}>
                📅 {new Date(foto.timestamp).toLocaleString("pt-BR")}
              </Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, finalizando && { opacity: 0.7 }]}
          onPress={handleFinalizar}
          disabled={finalizando}
        >
          {finalizando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Finalizar Ordem</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  conteudo: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    ...(Platform.OS === "web"
      ? {
        width: 1000, // exatamente o mesmo tamanho da tela "visualizar"
        maxWidth: "95%",
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 27,
        marginBottom: 30,
      }
      : {
        flex: 1,
        minWidth: 360,
        maxWidth: 360,
        marginVertical: 10
      }),
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#000",
    ...(Platform.OS === "web"
      ? {
        fontSize: 48,
      }
      : {}),
  },
  label: {
    fontWeight: "bold",
    color: "#333",
    marginVertical: 2,
    marginLeft: 5,
    ...(Platform.OS === "web"
      ? {
        fontSize: 16,
      }
      : {}),
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginBottom: 5,
    elevation: 2,
    ...(Platform.OS === "web" && {
      fontSize: 16,
      width: "40%",
    }),
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F39C12",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    justifyContent: "center",
    ...(Platform.OS === "web" && {
      marginVertical: 50,
    }),
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
    width: "100%",
    height: 100,
    borderRadius: 10,
  },
  removerBotao: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#e74c3c",
    width: 24,
    height: 24,
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
    height: 80,
    resizeMode: "contain",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 30,
  },
});
