import React, { useEffect, useState } from "react";
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
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
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
  const [numero, setNumero] = useState("");
  const [enderecoCompleto, setEnderecoCompleto] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [fotosAntes, setFotos] = useState<string[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clientesLista, setClientesLista] = useState<any[]>([]);
  const [listaVisivel, setListaVisivel] = useState(false);
  const [loadingOrdem, setLoadingOrdem] = useState(false);
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const carregarClientes = async () => {
      const snapshot = await getDocs(collection(db, "clientes"));
      const dados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClientesLista(dados);
    };

    carregarClientes();
  }, []);

  const uploadToCloudinary = async (uri: string): Promise<string> => {
    const data = new FormData();
    data.append("file", {
      uri,
      name: "imagem.jpg",
      type: "image/jpeg",
    } as any);
    data.append("upload_preset", "metest_unsigned");
    data.append("cloud_name", "dy48gdjlv");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dy48gdjlv/image/upload",
      {
        method: "POST",
        body: data,
      }
    );

    const json = await res.json();
    return json.secure_url;
  };

  const handlePickMultipleImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);

      const resizedUploads = await Promise.all(
        uris.map((uri) =>
          ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], {
            compress: 0.6,
            format: ImageManipulator.SaveFormat.JPEG,
          })
        )
      );

      const uploadedUrls = await Promise.all(
        resizedUploads.map((r) => uploadToCloudinary(r.uri))
      );

      setFotos((prev) => [...prev, ...uploadedUrls]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFotos((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const gerarNumeroOrdem = async (): Promise<string> => {
    const anoAtual = new Date().getFullYear();
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

    const numeroFormatado = String(novoNumero).padStart(4, "0");
    return `${anoAtual}-${numeroFormatado}`;
  };

  const handleSubmit = async () => {
    if (!cliente || !descricao || !localizacao) {
      Alert.alert("Preencha todos os campos obrigatórios");
      return;
    }

    setLoadingOrdem(true);

    try {
      const numeroOrdem = await gerarNumeroOrdem();

      await addDoc(collection(db, "relatorios_fotograficos"), {
        numeroOrdem,
        cliente,
        empresa,
        contato,
        telefone,
        email,
        descricao,
        localizacao: `${localizacao}, Nº ${numero}`,
        fotosAntes,
        status: "pendente",
        criadoEm: serverTimestamp(),
        tipo: "relatorio_fotografico",
      });

      Alert.alert(`Relatório n° ${numeroOrdem} criado com sucesso!`);
      setCliente("");
      setEmpresa("");
      setContato("");
      setTelefone("");
      setEmail("");
      setDescricao("");
      setCep("");
      setNumero("");
      setEnderecoCompleto("");
      setLocalizacao("");
      setBuscaCliente("");
      setFotos([]);
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao criar relatório:", error);
      Alert.alert("Erro ao salvar o relatório");
    } finally {
      setLoadingOrdem(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Relatório Fotográfico</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar cliente..."
        value={buscaCliente}
        onChangeText={(text) => {
          setBuscaCliente(text);
          setListaVisivel(true);
        }}
      />

      {listaVisivel && (
        <View style={styles.listaClientes}>
          {clientesLista
            .filter((cli) =>
              cli.nome.toLowerCase().includes(buscaCliente.toLowerCase())
            )
            .map((cli) => (
              <TouchableOpacity
                key={cli.id}
                onPress={() => {
                  setCliente(cli.nome);
                  setEmpresa(cli.empresa || "");
                  setCep(cli.cep || "");
                  setNumero(cli.numero || "");
                  setEnderecoCompleto(cli.endereco || "");
                  setLocalizacao(
                    `${cli.endereco || ""}, Nº ${cli.numero || ""}`
                  );
                  setContato(cli.contato || "");
                  setTelefone(cli.telefone || "");
                  setEmail(cli.email || "");
                  setBuscaCliente(cli.nome);
                  setListaVisivel(false);
                }}
              >
                <Text style={styles.itemCliente}>{cli.nome}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      <View style={styles.cardCliente}>
        <Text style={styles.cardTitle}>🧾 Dados do Cliente</Text>

        <View style={styles.infoRow}>
         
          <Ionicons name="business" size={20} color="#2c3e50" />
          <Text style={styles.infoText}>{cliente}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={20} color="#2c3e50" />
          <Text style={styles.infoText}>{contato}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#2c3e50" />
          <Text style={styles.infoText}>{telefone}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#2c3e50" />
          <Text style={styles.infoText}>{email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color="#2c3e50" />
          <Text style={styles.infoText}>
            {enderecoCompleto}, Nº {numero}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Descrição do Serviço:</Text>
      <TextInput
        style={styles.input}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <TouchableOpacity
        style={styles.imageButton}
        onPress={handlePickMultipleImages}
      >
        <MaterialIcons name="photo-camera" size={22} color="#fff" />
        <Text style={styles.imageButtonText}>Adicionar Foto</Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.label}>Fotos Auxiliares:</Text>

        <FlatList
          data={fotosAntes}
          horizontal
          showsHorizontalScrollIndicator={false}
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
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleSubmit}>
        <Text style={styles.botaoTexto}>Criar Relatório</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
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
          minWidth: "100%",
          paddingTop: 20,
          paddingBottom: 40,
          paddingHorizontal: 20,
          flex: 1,
        }),
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2e86de",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  listaClientes: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    maxHeight: 150,
    marginBottom: 10,
  },
  itemCliente: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
  },
  valor: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  botao: {
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
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
  },
  imageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  imagePreviewContainer: {
    position: "relative",
    marginRight: 8,
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
    width: 100,
    height: 100,
    resizeMode: "cover",
    borderRadius: 10,
  },
  cardCliente: {
    backgroundColor: "#fefefe",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2c3e50",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#34495e",
  },
});
