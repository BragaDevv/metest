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

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Você precisa permitir o uso da câmera.");
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    if (Platform.OS === "web") {
      try {
        setLoadingImagem(true);
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.5,
        });

        if (!result.canceled && result.assets.length > 0) {
          setFotos((prev) => [...prev, result.assets[0].uri]);
        }
      } catch (error) {
        console.error("Erro ao selecionar imagem na web:", error);
        alert("Erro ao selecionar imagem.");
      } finally {
        setLoadingImagem(false);
      }
    } else {
      Alert.alert(
        "Selecionar Imagem",
        "Escolha a origem da imagem:",
        [
          {
            text: "Câmera",
            onPress: async () => {
              const temPermissao = await requestCameraPermission();
              if (!temPermissao) return;

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
                console.error("Erro ao abrir a câmera:", error);
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
                const galleryResult = await ImagePicker.launchImageLibraryAsync(
                  {
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.5,
                  }
                );

                if (
                  !galleryResult.canceled &&
                  galleryResult.assets.length > 0
                ) {
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
    }
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
    
    <ScrollView contentContainerStyle={styles.container}>
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
        style={[styles.input, { height: 100 }]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
    position: "relative",
    ...(Platform.OS === "web"
      ? {
          width: "70%",
          maxWidth: "100%",
          alignSelf: "center",
          justifyContent: "center", // centraliza verticalmente
          alignItems: "center", // centraliza horizontalmente
          paddingTop: 40,
          paddingBottom: 40,
          borderRadius: 16,
          marginVertical: "2%",
        }
      : {}),
  },

  containerCEP: {
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
    width: "40%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginBottom: 5,
    elevation: 2,
    ...(Platform.OS === "web" && {
      width: "40%",
    }),
  },
  enderecoPreview: {
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
    marginVertical: 10,
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
    margin: 5,
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
    width: Platform.OS === "web" ? 140 : 120,
    height: Platform.OS === "web" ? 140 : 120,
    resizeMode: "cover",
    borderRadius: 10,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
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
