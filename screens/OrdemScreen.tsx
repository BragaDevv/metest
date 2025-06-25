import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
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
  const [cep, setCep] = useState("");
  const [enderecoCompleto, setEnderecoCompleto] = useState("");
  const [numero, setNumero] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [fotosAntes, setFotos] = useState<string[]>([]);
  const [loadingImagem, setLoadingImagem] = useState(false);
  const [carregandoCEP, setCarregandoCEP] = useState(false);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
    Alert.alert(
      "Selecionar Imagem",
      "Escolha a origem da imagem:",
      [
        {
          text: "Câmera",
          onPress: async () => {
            try {
              setLoadingImagem(true);
              const cameraResult = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5,
              });

              if (!cameraResult.canceled && cameraResult.assets.length > 0) {
                setFotos((prev) => [...prev, cameraResult.assets[0].uri]);
              }
            } catch (error) {
              Alert.alert("Erro ao abrir a câmera");
            } finally {
              setLoadingImagem(false);
            }
          },
        },
        {
          text: "Galeria",
          onPress: async () => {
            try {
              setLoadingImagem(true);
              const galleryResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5,
              });

              if (!galleryResult.canceled && galleryResult.assets.length > 0) {
                setFotos((prev) => [...prev, galleryResult.assets[0].uri]);
              }
            } catch (error) {
              Alert.alert("Erro ao acessar a galeria");
            } finally {
              setLoadingImagem(false);
            }
          },
        },
        {
          text: "Cancelar",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveImage = (uri: string) => {
    setFotos((prev) => prev.filter((foto) => foto !== uri));
  };

  const handleSubmit = async () => {
    if (!cliente || !empresa || !descricao || !localizacao || !numero) {
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
        localizacao: `${localizacao}, Nº ${numero}`,
        fotosAntes,
        status: "pendente",
        criadoEm: serverTimestamp(),
      });

      console.log("Chamando backend para enviar notificação");
      await fetch("https://metest-backend.onrender.com/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numeroOrdem,
          cliente,
          descricao,
        }),
      });

      Alert.alert(`Ordem n° ${numeroOrdem} criada com sucesso!`);
      setCliente("");
      setEmpresa("");
      setDescricao("");
      setCep("");
      setEnderecoCompleto("");
      setNumero("");
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
      <Image
        source={require("../assets/images/icon.png")}
        style={styles.bgLogo}
      />
      <Text style={styles.title}>Nova Ordem de Serviço</Text>
      <Text style={styles.label}>Nome do Cliente / Responsável:</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome do Cliente"
        value={cliente}
        onChangeText={setCliente}
      />
      <Text style={styles.label}>Empresa:</Text>
      <TextInput
        style={styles.input}
        placeholder="Empresa"
        value={empresa}
        onChangeText={setEmpresa}
      />
      <Text style={styles.label}>Descrição do Serviço:</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Descrição do Serviço"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <View style={styles.containerCEP}>
        <Text style={styles.label}>CEP:</Text>
        <TextInput
          style={styles.inputCEP}
          placeholder="CEP"
          value={cep}
          onChangeText={async (value) => {
            setCep(value);

            if (value.length === 8) {
              setCarregandoCEP(true);
              try {
                const responseViaCEP = await fetch(
                  `https://viacep.com.br/ws/${value}/json/`
                );
                if (!responseViaCEP.ok) throw new Error("ViaCEP fora do ar");

                const dataViaCEP = await responseViaCEP.json();
                if (dataViaCEP.erro)
                  throw new Error("CEP não encontrado no ViaCEP");

                const enderecoViaCEP = `${dataViaCEP.logradouro}, ${dataViaCEP.bairro}, ${dataViaCEP.localidade} - ${dataViaCEP.uf}`;
                setEnderecoCompleto(enderecoViaCEP);
                setLocalizacao(enderecoViaCEP);
              } catch (errorViaCEP) {
                try {
                  const responseBrasilAPI = await fetch(
                    `https://brasilapi.com.br/api/cep/v1/${value}`
                  );
                  if (!responseBrasilAPI.ok)
                    throw new Error("Erro na BrasilAPI");

                  const dataBrasil = await responseBrasilAPI.json();
                  const enderecoBrasil = `${dataBrasil.street}, ${dataBrasil.neighborhood}, ${dataBrasil.city} - ${dataBrasil.state}`;
                  setEnderecoCompleto(enderecoBrasil);
                  setLocalizacao(enderecoBrasil);
                } catch (errorBrasilAPI) {
                  Alert.alert(
                    "Erro",
                    "Não foi possível buscar o endereço. Verifique o CEP ou tente mais tarde."
                  );
                  setEnderecoCompleto("");
                }
              } finally {
                setCarregandoCEP(false);
              }
            } else {
              setEnderecoCompleto("");
            }
          }}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Número:</Text>
        <TextInput
          style={styles.inputCEP}
          placeholder="Número"
          value={numero}
          onChangeText={setNumero}
          keyboardType="numeric"
        />
      </View>
      {carregandoCEP ? (
        <ActivityIndicator
          size="small"
          color="#2e86de"
          style={{ marginVertical: 10 }}
        />
      ) : enderecoCompleto ? (
        <Text style={styles.enderecoPreview}>
          Endereço: {enderecoCompleto}, {numero}
        </Text>
      ) : null}

      {loadingImagem ? (
        <ActivityIndicator
          size="large"
          color="#2e86de"
          style={{ marginVertical: 15 }}
        />
      ) : (
        <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
          <MaterialIcons name="photo-camera" size={22} color="#fff" />
          <Text style={styles.imageButtonText}>Adicionar Foto</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={fotosAntes}
        horizontal
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: item }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImage}
              onPress={() => handleRemoveImage(item)}
            >
              <Ionicons name="close-circle" size={22} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Ionicons
          name="save-outline"
          size={22}
          color="#fff"
          style={{ marginRight: 8 }}
        />
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
  containerCEP: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  bgLogo: {
    position: "absolute",
    opacity: 0.06,
    width: "115%",
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
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginBottom: 5,
    elevation: 2,
  },
  inputCEP: {
    width: "30%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginBottom: 5,
    elevation: 2,
  },
  enderecoPreview: {
    backgroundColor: "#eef",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccd",
    fontSize: 14,
    color: "#333",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2e86de",
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
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
    top: -3,
    right: -3,
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
    marginVertical: 10,
    justifyContent: "center",
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
    marginVertical: 6,
    marginLeft: 5,
  },
});
