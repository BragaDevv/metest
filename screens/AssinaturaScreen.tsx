import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  Platform,
  ImageBackground,
} from "react-native";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import SignatureScreen from "react-native-signature-canvas";
import * as Location from "expo-location";
import { useAuth } from "@context/AuthContext";
import { WebView } from "react-native-webview";

interface FotoOrdem {
  url: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada" | "aguardando_assinatura";
  numeroOrdem?: string;
  executadoPorNome: string;
  assinatura_cliente?: string;
  assinatura_metest?: string;
  assinatura_metest_nome: string;
  fotosDepois?: FotoOrdem[];
  fotosAntes?: string[];
  descricaoFinal?: string;
  observacoes?: string;
  criadoEm?: any;
  inicioExecucao?: any;
  finalizadoEm?: any;
  executadoPor?: string;
  localInicio?: {
    latitude: number;
    longitude: number;
  };
}

const CLOUD_NAME = "dy48gdjlv";
const UPLOAD_PRESET = "metest_unsigned";

export default function AguardandoAssinaturaScreen() {
  const { user, tipo, logout } = useAuth();
  const [ordensAguardando, setOrdensAguardando] = useState<Ordem[]>([]);
  const auth = getAuth();
  const userEmail = auth.currentUser?.email;
  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string | null>(null);

  const [assinaturaVisivel, setAssinaturaVisivel] = useState<string | null>(
    null
  );
  const [assinaturaTemp, setAssinaturaTemp] = useState<string | null>(null);
  const [assinaturaCapturadaPara, setAssinaturaCapturadaPara] = useState<
    string | null
  >(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [localSelecionado, setLocalSelecionado] = useState<{
    latitude: number;
    longitude: number;
    localizacao: string;
  } | null>(null);

  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null);
  const [coordenadasSelecionadas, setCoordenadasSelecionadas] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [modalFotoVisivel, setModalFotoVisivel] = useState(false);
  const [timestampSelecionado, setTimestampSelecionado] = useState<
    number | null
  >(null);

  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    fetchOrdensAguardando();
  }, []);

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

  const fetchOrdensAguardando = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const aguardando = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            localInicio: data.localInicio ?? null, // <-- garante estrutura
          } as Ordem;
        })
        .filter((ordem) => ordem.status === "aguardando_assinatura");

      setOrdensAguardando(aguardando);
    } catch (err) {
      console.error("Erro ao buscar ordens aguardando assinatura:", err);
    }
  };

  const toggleDetalhes = (id: string) => {
    setDetalhesVisiveis(detalhesVisiveis === id ? null : id);
  };

const uploadAssinaturaParaCloudinary = async (base64: string) => {
  console.log("📤 Enviando assinatura para Cloudinary...");

  try {
    const formData = new FormData();
    formData.append("file", base64); // precisa ser "data:image/png;base64,..." completo
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await res.json();
    console.log("🌐 Resposta Cloudinary:", result);

    if (!result.secure_url) {
      console.warn("⚠️ URL da assinatura está vazia ou inválida.");
      return undefined;
    }

    console.log("✅ URL da assinatura:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("❌ Erro ao enviar assinatura para Cloudinary:", error);
    return undefined;
  }
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

          <Text>
            <Text style={styles.label}>Localização:</Text> {item.localizacao}
          </Text>

          <View style={styles.containerService}>
            {item.descricaoFinal && (
              <Text>
                <Text style={styles.label}>Serviço Realizado:</Text>{" "}
                {item.descricaoFinal}
              </Text>
            )}

            {item.observacoes && (
              <Text>
                <Text style={styles.label}>Observações:</Text>{" "}
                {item.observacoes}
              </Text>
            )}

            {Array.isArray(item.fotosDepois) && item.fotosDepois.length > 0 ? (
              <View>
                <Text style={styles.label}>Fotos - Serviço Realizado:</Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {item.fotosDepois.map((foto, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setFotoSelecionada(foto.url);
                        setCoordenadasSelecionadas({
                          lat: foto.latitude,
                          lng: foto.longitude,
                        });
                        setTimestampSelecionado(foto.timestamp);
                        setModalFotoVisivel(true);
                      }}
                    >
                      <Image
                        source={{ uri: foto.url }}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 6,
                          backgroundColor: "#eee",
                        }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ fontStyle: "italic", color: "#666" }}>
                Não há fotos em anexo.
              </Text>
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
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 6,
                }}
              >
                <Text>
                  <Text style={styles.label}>Localização do Executante:</Text>{" "}
                  {item.localInicio.latitude.toFixed(5)}
                  {item.localInicio.longitude.toFixed(5)}
                </Text>
                <TouchableOpacity
                  style={{
                    position: "relative",
                    left: -50,
                    top: 4,
                    ...(Platform.OS === "web"
                      ? {
                          left: 30,
                          top: 0,
                        }
                      : {}),
                  }}
                  onPress={async () => {
                    if (
                      item.localInicio?.latitude &&
                      item.localInicio?.longitude
                    ) {
                      try {
                        const enderecoResult =
                          await Location.reverseGeocodeAsync({
                            latitude: item.localInicio.latitude,
                            longitude: item.localInicio.longitude,
                          });

                        const enderecoLegivel = enderecoResult[0]
                          ? `${enderecoResult[0].street}, ${enderecoResult[0].district}, ${enderecoResult[0].city} - ${enderecoResult[0].region}`
                          : "Endereço não encontrado";

                        setLocalSelecionado({
                          latitude: item.localInicio.latitude,
                          longitude: item.localInicio.longitude,
                          localizacao: enderecoLegivel, // agora vem do reverse geocode
                        });

                        setModalVisible(true);
                      } catch (err) {
                        console.error("Erro ao buscar endereço:", err);
                        Alert.alert("Erro ao obter endereço do executante");
                      }
                    } else {
                      Alert.alert(
                        "Localização indisponível",
                        "Esta ordem não possui coordenadas do executante."
                      );
                    }
                  }}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={22}
                    color="#007bff"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
          {item.assinatura_cliente ? (
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
          ) : (
            <Text style={{ fontStyle: "italic", color: "#666" }}>
              Sem assinatura do Cliente.
            </Text>
          )}

          {item.assinatura_metest ||
          (item.id === assinaturaCapturadaPara && assinaturaTemp) ? (
            <View>
              <Text style={styles.label}>Assinatura Metest:</Text>
              <Image
                source={{
                  uri:
                    item.id === assinaturaCapturadaPara && assinaturaTemp
                      ? assinaturaTemp
                      : item.assinatura_metest,
                }}
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
          ) : (
            <Text style={{ fontStyle: "italic", color: "#666" }}>
              Sem assinatura ADM.
            </Text>
          )}
        </View>
      )}

      {Platform.OS !== "web" ? (
        item.id === assinaturaCapturadaPara && assinaturaTemp ? (
          <TouchableOpacity
            style={[styles.assinarButton, { backgroundColor: "#007bff" }]}
            onPress={async () => {
              if (!assinaturaTemp) {
                Alert.alert(
                  "Erro",
                  "Assinatura não capturada. Por favor, assine antes de finalizar."
                );
                return;
              }

              try {
                console.log("📤 Enviando assinatura para Cloudinary...");
                const urlAssinatura = await uploadAssinaturaParaCloudinary(
                  assinaturaTemp
                );
                console.log("✅ URL da assinatura:", urlAssinatura);

                if (!urlAssinatura) {
                  console.warn("⚠️ URL da assinatura está vazia ou inválida.");
                  Alert.alert(
                    "Erro",
                    "Falha ao obter a URL da assinatura. Tente novamente."
                  );
                  return;
                }

                await updateDoc(doc(db, "ordens_servico", item.id), {
                  status: "finalizada",
                  assinatura_metest: urlAssinatura,
                  assinatura_metest_nome: nome || "Desconhecido",
                  finalizadoEm: new Date(),
                });

                console.log("✅ Ordem finalizada com sucesso no Firestore");
                setAssinaturaTemp(null);
                setAssinaturaCapturadaPara(null);
                fetchOrdensAguardando();
                Alert.alert("✅ Ordem finalizada com sucesso!");
              } catch (error) {
                console.error("❌ Erro ao finalizar ordem:", error);
                Alert.alert("Erro ao finalizar ordem");
              }
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Finalizar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.assinarButton}
            onPress={() => {
              setAssinaturaVisivel(item.id);
              setAssinaturaCapturadaPara(item.id);
            }}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Assinar</Text>
          </TouchableOpacity>
        )
      ) : (
        <Text
          style={{
            marginTop: 10,
            fontStyle: "italic",
            color: "#888",
            textAlign: "center",
          }}
        >
          ✍️ Assinatura disponível apenas no mobile.
        </Text>
      )}
    </View>
  );

  const iframeHtml = `
  <html>
    <body style="margin:0;padding:0">
      <iframe 
        width="100%" 
        height="100%" 
        style="border:0;border-radius:10px"
        loading="lazy"
        allowfullscreen
        src="https://maps.google.com/maps?q=${localSelecionado?.latitude},${localSelecionado?.longitude}&z=17&output=embed"
      ></iframe>
    </body>
  </html>
`;

  return (
    <ImageBackground
      source={require("../assets/images/bgAll.jpg")}
      style={styles.container}
      resizeMode="stretch"
    >
      <View style={styles.conteudo}>
        <Text style={styles.title}>Aguardando Assinatura</Text>
        {ordensAguardando.length === 0 ? (
          <View style={styles.semOrdensContainer}>
            <Text style={styles.semOrdensTexto}>
              📭 Nenhuma ordem aguardando assinatura no momento.
            </Text>
          </View>
        ) : (
          <FlatList
            data={ordensAguardando}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30 }}
          />
        )}

        <Modal visible={!!assinaturaVisivel} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>✍️ Assine abaixo</Text>
                <TouchableOpacity
                  onPress={() => setAssinaturaVisivel(null)}
                  style={styles.modalCloseBtn}
                >
                  <Text style={styles.modalCloseText}>Fechar</Text>
                </TouchableOpacity>
              </View>

              <SignatureScreen
                onOK={(result) => {
                  setAssinaturaTemp(result);
                  setAssinaturaVisivel(null);
                }}
                onEmpty={() => Alert.alert("Assinatura vazia")}
                descriptionText=""
                clearText="Limpar"
                confirmText="Salvar"
              />
            </View>
          </View>
        </Modal>

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitleMaps}>
                  Localização do Executante
                </Text>

                {localSelecionado && (
                  <>
                    {Platform.OS !== "web" && localSelecionado.localizacao && (
                      <Text style={styles.modalEndereco}>
                        {localSelecionado.localizacao}
                      </Text>
                    )}

                    <View style={styles.modalMap}>
                      {Platform.OS === "web" ? (
                        <iframe
                          width="100%"
                          height="300"
                          style={{ border: 0, borderRadius: 10 }}
                          loading="lazy"
                          allowFullScreen
                          src={`https://maps.google.com/maps?q=${localSelecionado.latitude},${localSelecionado.longitude}&z=17&output=embed`}
                        />
                      ) : (
                        <WebView
                          originWhitelist={["*"]}
                          source={{ html: iframeHtml }}
                          style={{ height: 300, borderRadius: 10 }}
                        />
                      )}
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Fechar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={modalFotoVisivel} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {fotoSelecionada && (
              <View
                style={{ width: "90%", height: "70%", position: "relative" }}
              >
                <Image
                  source={{ uri: fotoSelecionada }}
                  style={{ width: "100%", height: "100%", borderRadius: 10 }}
                  resizeMode="contain"
                />
                {coordenadasSelecionadas && (
                  <Text
                    style={{
                      position: "absolute",
                      bottom: 70,
                      left: 12,
                      color: "#000",
                      backgroundColor: "#fff",
                      paddingHorizontal: 5,
                      paddingVertical: 4,
                      borderRadius: 0,
                      fontSize: 12,
                      ...(Platform.OS === "web"
                        ? {
                            bottom: 10,
                            left: 450,
                          }
                        : {}),
                    }}
                  >
                    {coordenadasSelecionadas.lat.toFixed(5)},{" "}
                    {coordenadasSelecionadas.lng.toFixed(5)}
                  </Text>
                )}
                {timestampSelecionado && (
                  <Text
                    style={{
                      position: "absolute",
                      bottom: 70,
                      left: 150,
                      color: "#000",
                      backgroundColor: "#fff",
                      paddingHorizontal: 5,
                      paddingVertical: 4,
                      borderRadius: 0,
                      fontSize: 12,
                      ...(Platform.OS === "web"
                        ? {
                            bottom: 40,
                            left: 450,
                          }
                        : {}),
                    }}
                  >
                    {new Date(timestampSelecionado).toLocaleString("pt-BR")}
                  </Text>
                )}
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    backgroundColor: "#e74c3c",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    setModalFotoVisivel(false);
                    setFotoSelecionada(null);
                    setCoordenadasSelecionadas(null);
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Fechar
                  </Text>
                </TouchableOpacity>
                <Image
                  source={require("../assets/images/logo-metest.png")}
                  style={styles.logoFoto}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </Modal>
      </View>
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
          flex: 1,
          width: "95%",
          marginVertical: 10,
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
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  assinarButton: {
    flexDirection: "row",
    backgroundColor: "#F39C12",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
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
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalTitleMaps: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalCloseBtn: {
    backgroundColor: "#dc3545",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modalCloseText: {
    color: "#fff",
    fontWeight: "bold",
  },
  containerService: {
    marginVertical: 10,
    flex: 1,
    gap: 12,
    borderWidth: 1,
    padding: 10,
  },
  semOrdensContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
  },
  semOrdensTexto: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    lineHeight: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },

  modalEndereco: {
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  modalMap: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalCloseButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  logoFoto: {
    position: "absolute",
    bottom: "74%",
    left: "3%",
    width: 100,
    height: 100,
    marginBottom: 20,
    ...(Platform.OS === "web"
      ? {
          top: -30,
          left: 450,
        }
      : {}),
  },
});
