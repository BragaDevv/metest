import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ImageBackground,
  Platform,
  Linking,
} from "react-native";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "@context/AuthContext";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";

interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada";
  numeroOrdem?: string;
  fotosAntes?: string[];
  fotosDepois?: {
    url: string;
    latitude: number;
    longitude: number;
    timestamp: number;
  }[];
  criadoEm?: { seconds: number };
  descricaoFinal?: string;
  observacoes?: string;
  executadoPor?: string;
  inicioExecucao?: { seconds: number };
  finalizadoEm?: { seconds: number };
  localInicio?: {
    latitude: number;
    longitude: number;
  };
  assinatura_cliente?: string;
  assinatura_metest?: string;
  assinatura_metest_nome: string;
  executadoPorNome: string;
}

export default function OrdensFinalizadasScreen() {
  const { user, tipo, logout } = useAuth();
  const [ordensFinalizadas, setOrdensFinalizadas] = useState<Ordem[]>([]);
  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string | null>(null);
  const [localSelecionado, setLocalSelecionado] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const carregarNome = async () => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          if (snap.exists()) {
            const dados = snap.data();
            setNome(dados?.nome || null);
            console.log(`👤 Logado como ${dados?.nome}`);
          }
        } catch (err) {
          console.warn("Erro ao buscar nome do usuário:", err);
        }
      }
    };
    carregarNome();
  }, [user]);



  const gerarPDFLocal = async (ordem: Ordem) => {
    try {
      const fotosAntes = ordem.fotosAntes?.map(
        (url) => `<img src="${url}" style="width:100%;margin-bottom:10px;" />`
      ).join("") || "";

      const fotosDepois = ordem.fotosDepois?.map(
        (f) => `<img src="${f.url}" style="width:100%;margin-bottom:10px;" />`
      ).join("") || "";

      const html = `
<html>
  <head>
    <meta charset="utf-8" />
    <title>Relatório Fotográfico - METEST</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 24px;
        color: #333;
        background-color: #f9f9f9;
      }
      h1 {
        text-align: center;
        color: #4a4a91;
        margin-bottom: 24px;
      }
      .box {
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 10px 10px;
        margin-bottom: 10px;
        background-color: #fff;
      }
      .label {
        font-weight: bold;
        color: #222;
      }
      .grid-2x2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
      }
      .grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
      }
      .grid img {
        width: 150px;
        height: 150px;
        object-fit: cover;
        border: 1px solid #ccc;
        border-radius: 6px;
      }
      .assinaturas {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 16px;
      }
      .assinatura img {
        width: 100%;
        max-width: 300px;
        max-height: 100px;
        border: 1px solid #aaa;
        border-radius: 6px;
      }
      .link {
        margin-top: 6px;
        display: inline-block;
        color: #007bff;
        text-decoration: none;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <h1>Relatório Fotográfico de Serviço</h1>

    <div class="box grid-2x2">
      <div><span class="label">Ordem nº:</span> ${ordem.numeroOrdem}</div>
      <div><span class="label">Cliente:</span> ${ordem.cliente}</div>
      <div><span class="label">Empresa:</span> ${ordem.empresa}</div>
      <div><span class="label">Data:</span> ${ordem.finalizadoEm ? new Date(ordem.finalizadoEm.seconds * 1000).toLocaleString("pt-BR") : "-"}</div>
    </div>

    <div class="box">
      <div><span class="label">Descrição do Serviço:</span></div>
      <p>${ordem.descricaoFinal || "-"}</p>

      <div><span class="label">Observações:</span></div>
      <p>${ordem.observacoes || "-"}</p>

      ${ordem.localInicio
          ? `<div><span class="label">Localização GPS:</span><br/>
            ${ordem.localInicio.latitude}, ${ordem.localInicio.longitude}
            <br/><a class="link" href="http://maps.google.com/maps?z=12&t=m&q=${ordem.localInicio.latitude},${ordem.localInicio.longitude}" target="_blank">Ver no mapa</a></div>`
          : ""
        }
    </div>

    ${ordem.fotosAntes?.length
          ? `<div class="box">
          <div class="label">Fotos Antes:</div>
          <div class="grid">
            ${ordem.fotosAntes.map((url) => `<img src="${url}" />`).join("")}
          </div>
        </div>`
          : ""
        }

    ${ordem.fotosDepois?.length
          ? `<div class="box">
          <div class="label">Fotos Depois:</div>
          <div class="grid">
            ${ordem.fotosDepois.map((f) => `<img src="${f.url}" />`).join("")}
          </div>
        </div>`
          : ""
        }

    ${ordem.assinatura_cliente || ordem.assinatura_metest
          ? `<div class="box">
            <div class="label">Assinaturas:</div>
            <div class="assinaturas">
              ${ordem.assinatura_cliente
            ? `<div class="assinatura"><span class="label">Cliente:</span><br/><img src="${ordem.assinatura_cliente}" /></div>`
            : ""
          }
              ${ordem.assinatura_metest
            ? `<div class="assinatura"><span class="label">METEST:</span><br/><img src="${ordem.assinatura_metest}" /></div>`
            : ""
          }
            </div>
          </div>`
          : ""
        }

  </body>
</html>
`;




      if (Platform.OS === "web") {
        // Web: cria blob e força download
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.print();
          }, 500);
        };
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      Alert.alert("Erro", "Falha ao gerar PDF");
    }
  };




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

  useEffect(() => {
    fetchOrdensFinalizadas();
  }, []);

  const toggleDetalhes = (id: string) => {
    setDetalhesVisiveis(detalhesVisiveis === id ? null : id);
  };

  const renderItem = ({ item }: { item: Ordem }) => (
    <View style={styles.card}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.numeroOrdem}>Ordem nº {item.numeroOrdem}</Text>
        <TouchableOpacity onPress={() => toggleDetalhes(item.id)}>
          <Ionicons
            name={
              detalhesVisiveis === item.id
                ? "remove-circle-outline"
                : "add-circle-outline"
            }
            size={24}
            color="#007bff"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.titleCard}>
        {item.cliente} - {item.empresa}
      </Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {detalhesVisiveis === item.id && (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Text>
            <Text style={styles.label}>Descrição:</Text> {item.descricao}
          </Text>
          <Text>
            <Text style={styles.label}>Localização:</Text> {item.localizacao}
          </Text>

          {Array.isArray(item.fotosAntes) && item.fotosAntes.length > 0 && (
            <View>
              <Text style={styles.label}>Fotos da Criação da Ordem:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {item.fotosAntes.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 6,
                      backgroundColor: "#eee",
                    }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          {item.descricaoFinal && (
            <Text>
              <Text style={styles.label}>Serviço Realizado:</Text>{" "}
              {item.descricaoFinal}
            </Text>
          )}

          {item.observacoes && (
            <Text>
              <Text style={styles.label}>Observações:</Text> {item.observacoes}
            </Text>
          )}

          {Array.isArray(item.fotosDepois) && item.fotosDepois.length > 0 && (
            <View>
              <Text style={styles.label}>Fotos - Serviço Realizado:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {item.fotosDepois.map((foto, index) => (
                  <Image
                    key={index}
                    source={{ uri: foto.url }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 6,
                      backgroundColor: "#eee",
                    }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          {item.criadoEm && (
            <Text>
              <Text style={styles.label}>Abertura:</Text>{" "}
              {new Date(item.criadoEm.seconds * 1000).toLocaleString("pt-BR")}
            </Text>
          )}

          {item.executadoPorNome && (
            <Text>
              <Text style={styles.label}>Executado por:</Text>
              <Text> {item.executadoPorNome}</Text>
            </Text>
          )}

          {item.inicioExecucao && (
            <Text>
              <Text style={styles.label}>Início da Execução:</Text>{" "}
              {new Date(item.inicioExecucao.seconds * 1000).toLocaleString(
                "pt-BR"
              )}
            </Text>
          )}

          {item.finalizadoEm && (
            <Text>
              <Text style={styles.label}>Finalizado em:</Text>{" "}
              {new Date(item.finalizadoEm.seconds * 1000).toLocaleString(
                "pt-BR"
              )}
            </Text>
          )}

          {item.localInicio && (
            <TouchableOpacity
              style={{ marginTop: 6 }}
              onPress={async () => {
                try {
                  const enderecoResult = await Location.reverseGeocodeAsync({
                    latitude: item.localInicio!.latitude,
                    longitude: item.localInicio!.longitude,
                  });
                  const enderecoLegivel = enderecoResult[0]
                    ? `${enderecoResult[0].street}, ${enderecoResult[0].district}, ${enderecoResult[0].city} - ${enderecoResult[0].region}`
                    : "Endereço não encontrado";
                  Alert.alert("Localização do Executante", enderecoLegivel);
                } catch (err) {
                  Alert.alert("Erro", "Erro ao buscar endereço do executante");
                }
              }}
            >
              <Text>
                <Text style={styles.label}>Ver Localização do Executante </Text>
                <Ionicons name="location" size={20} color="#007bff" />
              </Text>
            </TouchableOpacity>
          )}

          {item.assinatura_cliente && (
            <View>
              <Text style={styles.label}>Assinatura do Cliente:</Text>
              <Image
                source={{ uri: item.assinatura_cliente }}
                style={{
                  width: 200,
                  height: 100,
                  borderRadius: 6,
                  marginTop: 6,
                  backgroundColor: "#eee",
                }}
                resizeMode="contain"
              />
            </View>
          )}

          {item.assinatura_metest && (
            <View>
              <Text style={styles.label}>
                Assinatura Metest : {nome ? nome : user?.email}
              </Text>
              <Image
                source={{ uri: item.assinatura_metest }}
                style={{
                  width: 200,
                  height: 100,
                  borderRadius: 6,
                  marginTop: 6,
                  backgroundColor: "#eee",
                }}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.pdfButton} onPress={() => gerarPDFLocal(item)}>
        <Ionicons name="document" size={18} color="#fff" />
        <Text style={styles.buttonText}>Gerar PDF</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.conteudo}>
      <Text style={styles.title}>Ordens Concluídas</Text>
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

  conteudo: {
    backgroundColor: "#fff",
    borderRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    ...(Platform.OS === "web"
      ? {
        width: "70%",
        maxWidth: "100%",
        alignSelf: "center",
        justifyContent: "center", // centraliza verticalmente
        alignItems: "center", // centraliza horizontalmente
        paddingTop: 40,
        paddingBottom: 40,
        marginVertical: "2%",
      }
      : {
        minWidth: '100%',
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        flex: 1,
      }),
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  card: {
    backgroundColor: "#FDEBD0",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    ...(Platform.OS === "web"
      ? {
        width: 700,
      }
      : {}),
  },
  numeroOrdem: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  titleCard: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#000",
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 12,
  },
  label: {
    marginTop: 10,
    fontWeight: "bold",
    color: "#333",
  },
  pdfButton: {
    marginTop: 12,
    backgroundColor: "#F39C12",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
