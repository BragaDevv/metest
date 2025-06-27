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
  Platform,
  ImageBackground,
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
import * as ImageManipulator from "expo-image-manipulator";

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
  const [cepNaoAplicavel, setCepNaoAplicavel] = useState(false);
  const [loadingOrdem, setLoadingOrdem] = useState(false);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const gerarNumeroOrdem = async (): Promise<string> => {
    const anoAtual = new Date().getFullYear(); // ex: 2025
    const controleRef = doc(db, "controle_ordens", `contador_${anoAtual}`);
    const snap = await getDoc(controleRef);

    let novoNumero = 1;

    if (snap.exists()) {
      const data = snap.data();
      novoNumero = data.ultimoNumero + 1;
      await updateDoc(controleRef, { ultimoNumero: increment(1) });
    } else {
      await setDoc(controleRef, { ultimoNumero: 1 });
    }

    const numeroFormatado = String(novoNumero).padStart(4, "0"); // ex: 0001
    return `${anoAtual}-${numeroFormatado}`; // ex: 2025-0001
  };

  const formatarCEP = (valor: string) => {
    const cepNumeros = valor.replace(/\D/g, ""); // remove tudo que não for número
    if (cepNumeros.length <= 5) return cepNumeros;
    return `${cepNumeros.slice(0, 5)}-${cepNumeros.slice(5, 8)}`;
  };

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", {
      uri,
      name: "imagem.jpg",
      type: "image/jpeg",
    } as any);
    data.append("upload_preset", "mndd_unsigned");
    data.append("cloud_name", "dy48gdjlv");

    const res = await fetch("https://api.cloudinary.com/v1_1/dy48gdjlv/image/upload", {
      method: "POST",
      body: data,
    });

    const json = await res.json();
    return json.secure_url;
  };


  const handlePickMultipleImages = async () => {
    const requestCameraPermission = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Você precisa permitir o uso da câmera.");
        return false;
      }
      return true;
    };

    Alert.alert(
      "Selecionar Imagem",
      "Escolha a origem das imagens:",
      [
        {
          text: "Câmera",
          onPress: async () => {
            const permitido = await requestCameraPermission();
            if (!permitido) return;

            try {
              setLoadingImagem(true);

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.6,
              });

              if (!result.canceled && result.assets.length > 0) {
                const resized = await ImageManipulator.manipulateAsync(
                  result.assets[0].uri,
                  [{ resize: { width: 800 } }],
                  { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
                );

                const cloudUrl = await uploadToCloudinary(resized.uri);
                setFotos((prev) => [...prev, cloudUrl]);
              }
            } catch (err) {
              console.error("Erro com câmera:", err);
              Alert.alert("Erro ao tirar foto.");
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

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.6,
              });

              if (!result.canceled && result.assets.length > 0) {
                const uris = result.assets.map((a) => a.uri);

                const resizedUploads = await Promise.all(
                  uris.map((uri) =>
                    ImageManipulator.manipulateAsync(
                      uri,
                      [{ resize: { width: 800 } }],
                      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
                    )
                  )
                );

                const uploadedUrls = await Promise.all(
                  resizedUploads.map((r) => uploadToCloudinary(r.uri))
                );

                setFotos((prev) => [...prev, ...uploadedUrls]);
              }
            } catch (err) {
              console.error("Erro na galeria:", err);
              Alert.alert("Erro ao selecionar imagens.");
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




  const handleRemoveImage = (indexToRemove: number) => {
    setFotos((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!cliente || !empresa || !descricao) {
      Alert.alert("Preencha todos os campos obrigatórios");
      return;
    }

    if (!cepNaoAplicavel && (!localizacao || !numero)) {
      Alert.alert("Preencha o CEP e Número ou marque como 'Não aplicável'");
      return;
    }

    setLoadingOrdem(true);

    try {
      const numeroOrdem = await gerarNumeroOrdem();

      await addDoc(collection(db, "ordens_servico"), {
        numeroOrdem,
        cliente,
        empresa,
        descricao,
        localizacao: cepNaoAplicavel
          ? "Endereço não aplicável"
          : `${localizacao}, Nº ${numero}`,
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
    } finally {
      setLoadingOrdem(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/bgAll.jpg")}
      style={styles.bg}
      resizeMode="stretch"
    >

      <ScrollView contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nova Ordem de Serviço</Text>

        <Text style={styles.label}>Nome do Cliente:</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do Cliente"
          placeholderTextColor="#ccc"
          value={cliente}
          onChangeText={setCliente}
        />
        <Text style={styles.label}>Empresa:</Text>
        <TextInput
          style={styles.input}
          placeholder="Empresa"
          placeholderTextColor="#ccc"
          value={empresa}
          onChangeText={setEmpresa}
        />

        <Text style={styles.label}>Descrição do Serviço:</Text>
        <TextInput
          style={[styles.input, {
            minHeight: 70, maxHeight: 70, maxWidth: 360, textAlignVertical: "top", ...(Platform.OS === "web" && {
              minHeight: 100, maxHeight: 120, maxWidth: 560, minWidth: 560
            }),
          }]}
          placeholder="Descrição do Serviço"
          placeholderTextColor="#ccc"
          value={descricao}
          onChangeText={setDescricao}
          multiline
        />

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => {
              const novoEstado = !cepNaoAplicavel;
              setCepNaoAplicavel(novoEstado);
              if (novoEstado) {
                setCep("");
                setEnderecoCompleto("");
                setNumero("");
                setLocalizacao("");
              }
            }}
          >
            {cepNaoAplicavel ? (
              <Ionicons name="checkbox" size={24} color="#2e86de" />
            ) : (
              <Ionicons name="square-outline" size={24} color="#ccc" />
            )}
            <Text style={styles.checkboxLabel}>Endereço"Não aplicável"</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.containerCEP}>
          <TextInput
            style={[
              styles.inputCEP,
              cepNaoAplicavel && { backgroundColor: "#ddd" },
            ]}
            placeholder="CEP"
            placeholderTextColor="#ccc"
            value={cep}
            onChangeText={async (value) => {
              const cepFormatado = formatarCEP(value);
              setCep(cepFormatado);

              const apenasNumeros = cepFormatado.replace(/\D/g, "");

              if (apenasNumeros.length === 8) {
                setCarregandoCEP(true);
                try {
                  const responseViaCEP = await fetch(
                    `https://viacep.com.br/ws/${apenasNumeros}/json/`
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
                      `https://brasilapi.com.br/api/cep/v1/${apenasNumeros}`
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
            maxLength={9}
            editable={!cepNaoAplicavel}
          />

          <TextInput
            style={[
              styles.inputCEP,
              cepNaoAplicavel && { backgroundColor: "#ddd" },
            ]}
            placeholder="Número"
            placeholderTextColor="#ccc"
            value={numero}
            onChangeText={setNumero}
            keyboardType="numeric"
            editable={!cepNaoAplicavel}
          />

        </View>
        <View style={styles.containerCEP}>
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
        </View>
        {loadingImagem ? (
          <ActivityIndicator
            size="large"
            color="#2e86de"
            style={{ marginVertical: 10 }}
          />
        ) : (
          <TouchableOpacity style={styles.imageButton} onPress={handlePickMultipleImages}>
            <MaterialIcons name="photo-camera" size={22} color="#fff" />
            <Text style={styles.imageButtonText}>Adicionar Foto</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === "web" ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 12,
              paddingHorizontal: 10,
              marginBottom: 30,
            }}
          >
            {fotosAntes.map((item, index) => (
              <View key={index} style={styles.imagePreviewContainer}>
                <Image source={{ uri: item }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={22} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={fotosAntes}
            horizontal
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ paddingVertical: 10 }}
            renderItem={({ item, index }) => (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: item }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImage}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={22} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {loadingOrdem ? (
          <ActivityIndicator
            size="large"
            color="#27ae60"
            style={{ marginVertical: 20 }}
          />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Ionicons
              name="save-outline"
              size={22}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Salvar Ordem</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  bg: {
    flex: 1,
    alignItems: "center",
    width: "100%",
    height: "100%",
  },

  container: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    ...(Platform.OS === "web"
      ? {
        width: 1000, // exatamente o mesmo tamanho da tela "visualizar"
        maxWidth: "95%",
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 30,
        marginBottom: 30,
      }
      : {
        minWidth: 360,
        maxWidth: 360,
        paddingVertical: 20,
        marginVertical: 10,
        flexGrow: 1,
      }),
  },


  containerCEP: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 0,
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
    color: "#000",
    ...(Platform.OS === "web" && {
      fontSize: 48,
      marginTop: 20,
    }),
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
  inputCEP: {
    width: "50%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 5,
    marginBottom: 5,
    elevation: 2,
    ...(Platform.OS === "web" && {
      width: "40%",
    }),
  },
  enderecoPreview: {
    maxWidth: 330,
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: "#eef",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccd",
    fontSize: 14,
    color: "#333",
    ...(Platform.OS === "web" && {
      marginVertical: "5%",
    }),
  },
  imageButton: {
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
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    marginRight: 5,
  },
  removeImage: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 2,
  },
  imagePreview: {
    width: Platform.OS === "web" ? 140 : 100,
    height: Platform.OS === "web" ? 140 : 100,
    resizeMode: "cover",
    borderRadius: 10,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 12,
    marginBottom: 5,
    justifyContent: "center",
    elevation: 4,
    ...(Platform.OS === "web" && {
      width: 300,
      alignSelf: "center",
    }),
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 17,
  },
  checkboxLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
});
