import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Location from "expo-location";
import { useAuth } from "@context/AuthContext";

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

  const getAssinaturaUri = (assinatura: string) => assinatura;

  const gerarPDF = async (ordem: Ordem) => {
    const logoUrl =
      "https://res.cloudinary.com/dy48gdjlv/image/upload/v1750811880/logo-metest_f9wxzj.png";

    const dataHora = ordem.finalizadoEm?.seconds
      ? new Date(ordem.finalizadoEm.seconds * 1000).toLocaleString("pt-BR")
      : ordem.criadoEm?.seconds
      ? new Date(ordem.criadoEm.seconds * 1000).toLocaleString("pt-BR")
      : "";

    const criadoEm = ordem.criadoEm?.seconds
      ? new Date(ordem.criadoEm.seconds * 1000).toLocaleString("pt-BR")
      : "—";

    const inicioExecucao = ordem.inicioExecucao?.seconds
      ? new Date(ordem.inicioExecucao.seconds * 1000).toLocaleString("pt-BR")
      : "—";

    const finalizadoEm = ordem.finalizadoEm?.seconds
      ? new Date(ordem.finalizadoEm.seconds * 1000).toLocaleString("pt-BR")
      : "—";

    const fotosHtml =
      ordem.fotosDepois && ordem.fotosDepois.length > 0
        ? ordem.fotosDepois
            .map(
              (foto) => `
        <div style="display: inline-block; width: 20%; margin: 0.5%;">
          <img src="${foto.url}" style="width: 100%; border-radius: 4px;" />
          <p style="font-size: 8px; margin: 2px 0;">
            📍 ${foto.latitude.toFixed(5)}, ${foto.longitude.toFixed(5)}<br/>
            🕒 ${new Date(foto.timestamp).toLocaleString("pt-BR")}
          </p>
        </div>
      `
            )
            .join("")
        : "<p style='font-style: italic;'>Sem fotos disponíveis.</p>";

    const htmlContent = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 11px;
          padding: 10px;
          margin: 0;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
        }
        .logo {
          width: 160px;
          margin-bottom: 6px;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .row {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }
        .section {
          flex: 1;
          border: 1px solid #ccc;
          border-radius: 6px;
          padding: 5px;
        }
        .label {
          font-weight: bold;
        }
        .assinatura {
          width: 48%;
          display: inline-block;
          vertical-align: top;
          text-align: center;
        }
        .assinatura img {
          width: 100%;
          max-width: 180px;
          height: 70px;
          border: 1px solid #ccc;
          border-radius: 4px;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" class="logo" />
        <div class="title">Relatório Fotográfico de Serviço</div>
        <p><em>Gerado em: ${dataHora}</em></p>
      </div>

      <div class="row">
        <div class="section">
          <p><span class="label">Ordem Nº:</span> ${ordem.numeroOrdem}</p>
          <p><span class="label">Cliente:</span> ${ordem.cliente}</p>
          <p><span class="label">Empresa:</span> ${ordem.empresa}</p>
          <span class="label">Executado por:</span> ${
            ordem.executadoPorNome || ordem.executadoPor || "—"
          }
        </div>

        <div class="section">
          <p><span class="label"> Abertura:</span> ${criadoEm}</p>
          <p><span class="label"> Início Execução:</span> ${inicioExecucao}</p>
          <p><span class="label"> Finalização:</span> ${finalizadoEm}</p>
        </div>
      </div>

      <div class="section">
        <p><span class="label">Serviço:</span> ${
          ordem.descricaoFinal || ordem.descricao
        }</p>
        <p><span class="label">Localização:</span> ${ordem.localizacao}</p>
      </div>

      <div class="section">
        <p class="label">Fotos do Serviço:</p>
        ${fotosHtml}
      </div>

      <div class="section">
        <p class="label">Assinaturas:</p>
        <div class="assinatura">
          <p><span class="label">Cliente:</span> ${ordem.cliente}</p>
          ${
            ordem.assinatura_cliente
              ? `<img src="${ordem.assinatura_cliente}" />`
              : "<p>Sem assinatura</p>"
          }
        </div>
        <div class="assinatura">
          <p><span class="label">METEST:</span> ${
            ordem.assinatura_metest_nome || ordem.executadoPor
          }</p>
          ${
            ordem.assinatura_metest
              ? `<img src="${ordem.assinatura_metest}" />`
              : "<p>Sem assinatura</p>"
          }
        </div>
      </div>
    </body>
  </html>
  `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    await Sharing.shareAsync(uri);
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
                source={{ uri: getAssinaturaUri(item.assinatura_cliente) }}
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
                source={{ uri: getAssinaturaUri(item.assinatura_metest) }}
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

      <TouchableOpacity style={styles.pdfButton} onPress={() => gerarPDF(item)}>
        <Ionicons name="document" size={18} color="#fff" />
        <Text style={styles.buttonText}>Gerar PDF</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
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
  titleCard: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },
  status: { marginTop: 8, fontWeight: "bold", color: "#555" },
  label: { fontWeight: "bold", color: "#333" },
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
  buttonText: { color: "#fff", fontWeight: "bold" },
});
