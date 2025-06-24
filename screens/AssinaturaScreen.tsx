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
} from "react-native";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import SignatureScreen from "react-native-signature-canvas";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";


interface Ordem {
  id: string;
  cliente: string;
  empresa: string;
  descricao: string;
  localizacao: string;
  status: "pendente" | "em_execucao" | "finalizada" | "aguardando_assinatura";
  numeroOrdem?: string;
  assinatura_cliente?: string;
  assinatura_metest?: string;
  fotosDepois?: string[];
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

export default function AguardandoAssinaturaScreen() {
  const [ordensAguardando, setOrdensAguardando] = useState<Ordem[]>([]);
  const auth = getAuth();
  const userEmail = auth.currentUser?.email;
  const isAdmin = userEmail === "admin@metest.com";
  const [detalhesVisiveis, setDetalhesVisiveis] = useState<string | null>(null);

  const [assinaturaVisivel, setAssinaturaVisivel] = useState<string | null>(null);
  const [assinaturaTemp, setAssinaturaTemp] = useState<string | null>(null);
  const [assinaturaCapturadaPara, setAssinaturaCapturadaPara] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [localSelecionado, setLocalSelecionado] = useState<{
    latitude: number;
    longitude: number;
    localizacao: string;
  } | null>(null);


  useEffect(() => {
    if (!isAdmin) {
      Alert.alert("Acesso negado", "Apenas administradores podem acessar esta tela.");
    } else {
      fetchOrdensAguardando();
    }
  }, []);

  const fetchOrdensAguardando = async () => {
    try {
      const snapshot = await getDocs(collection(db, "ordens_servico"));
      const aguardando = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          localInicio: data.localInicio ?? null, // <-- garante estrutura
        } as Ordem;
      }).filter((ordem) => ordem.status === "aguardando_assinatura");

      setOrdensAguardando(aguardando);
    } catch (err) {
      console.error("Erro ao buscar ordens aguardando assinatura:", err);
    }
  };

  const toggleDetalhes = (id: string) => {
    setDetalhesVisiveis(detalhesVisiveis === id ? null : id);
  };

  const getAssinaturaUri = (assinaturaBase64?: string): string | undefined => {
    if (!assinaturaBase64) return undefined;
    if (assinaturaBase64.startsWith("data:image")) return assinaturaBase64;
    return `data:image/png;base64,${assinaturaBase64}`;
  };

  const renderItem = ({ item }: { item: Ordem }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.numeroOrdem}>Ordem nº {item.numeroOrdem}</Text>
        <TouchableOpacity onPress={() => toggleDetalhes(item.id)}>
          <Ionicons
            name={detalhesVisiveis === item.id ? "remove-circle-outline" : "add-circle-outline"}
            size={24}
            color="#007bff"
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>{item.cliente} - {item.empresa}</Text>
      <Text style={styles.status}>Status: {item.status}</Text>

      {detalhesVisiveis === item.id && (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Text><Text style={styles.label}>Descrição:</Text> {item.descricao}</Text>

          {Array.isArray(item.fotosAntes) && item.fotosAntes.length > 0 && (
            <View>
              <Text style={styles.label}>Fotos da Criação da Ordem:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {item.fotosAntes.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={{ width: 100, height: 100, borderRadius: 6, backgroundColor: "#eee" }}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          <Text><Text style={styles.label}>Localização:</Text> {item.localizacao}</Text>

          <View style={styles.containerService}>
            {item.descricaoFinal && (
              <Text><Text style={styles.label}>Serviço Realizado:</Text> {item.descricaoFinal}</Text>
            )}

            {item.observacoes && (
              <Text><Text style={styles.label}>Observações:</Text> {item.observacoes}</Text>
            )}

            {Array.isArray(item.fotosDepois) && item.fotosDepois.length > 0 ? (
              <View>
                <Text style={styles.label}>Fotos - Serviço Realizado:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {item.fotosDepois.map((url, index) => (
                    <Image
                      key={index}
                      source={{ uri: url }}
                      style={{ width: 100, height: 100, borderRadius: 6, backgroundColor: "#eee" }}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ fontStyle: "italic", color: "#666" }}>Não há fotos em anexo.</Text>
            )}

            {item.criadoEm && (
              <Text><Text style={styles.label}>Abertura:</Text> {new Date(item.criadoEm.seconds * 1000).toLocaleString("pt-BR")}</Text>
            )}
            {item.executadoPor && (
              <Text><Text style={styles.label}>Executado por:</Text> {item.executadoPor}</Text>
            )}
            {item.inicioExecucao && (
              <Text><Text style={styles.label}>Início da Execução:</Text> {new Date(item.inicioExecucao.seconds * 1000).toLocaleString("pt-BR")}</Text>
            )}
            {item.finalizadoEm && (
              <Text><Text style={styles.label}>Finalizado em:</Text> {new Date(item.finalizadoEm.seconds * 1000).toLocaleString("pt-BR")}</Text>
            )}

            {item.localInicio && (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                <Text>
                  <Text style={styles.label}>Localização do Executante:</Text>{" "}
                  {item.localInicio.latitude.toFixed(5)}
                  {item.localInicio.longitude.toFixed(5)}
                </Text>
                <TouchableOpacity
                  style={{ position: 'relative', left: -100, top: 4 }}
                  onPress={async () => {
                    if (item.localInicio?.latitude && item.localInicio?.longitude) {
                      try {
                        const enderecoResult = await Location.reverseGeocodeAsync({
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
                      Alert.alert("Localização indisponível", "Esta ordem não possui coordenadas do executante.");
                    }
                  }}

                >
                  <Ionicons name="add-circle-outline" size={22} color="#007bff" />
                </TouchableOpacity>
              </View>
            )}



          </View>
          {item.assinatura_cliente ? (
            <View>
              <Text style={styles.label}>Assinatura do Cliente:</Text>
              <Image
                source={{ uri: getAssinaturaUri(item.assinatura_cliente) }}
                style={{ width: 200, height: 100, borderRadius: 6, marginTop: 6, backgroundColor: "#eee" }}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={{ fontStyle: "italic", color: "#666" }}>Sem assinatura do Cliente.</Text>
          )}

          {(item.assinatura_metest || (item.id === assinaturaCapturadaPara && assinaturaTemp)) ? (
            <View>
              <Text style={styles.label}>Assinatura Metest:</Text>
              <Image
                source={{
                  uri: item.id === assinaturaCapturadaPara && assinaturaTemp
                    ? assinaturaTemp
                    : getAssinaturaUri(item.assinatura_metest),
                }}
                style={{ width: 200, height: 100, borderRadius: 6, marginTop: 6, backgroundColor: "#eee" }}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={{ fontStyle: "italic", color: "#666" }}>Sem assinatura ADM.</Text>
          )}

        </View>
      )}

      {item.id === assinaturaCapturadaPara && assinaturaTemp ? (
        <TouchableOpacity
          style={[styles.assinarButton, { backgroundColor: "#007bff" }]}
          onPress={async () => {
            try {
              await updateDoc(doc(db, "ordens_servico", item.id), {
                status: "finalizada",
                assinatura_metest: assinaturaTemp,
                finalizadoEm: new Date(),
              });
              setAssinaturaTemp(null);
              setAssinaturaCapturadaPara(null);
              fetchOrdensAguardando();
              Alert.alert("✅ Ordem finalizada com sucesso!");
            } catch (error) {
              console.error("Erro ao finalizar ordem:", error);
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
      )}
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', fontWeight: 'bold', textAlign: 'center' }}>
          Acesso restrito: somente administradores podem ver esta tela.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ordensAguardando.length === 0 ? (
        <View style={styles.semOrdensContainer}>
          <Text style={styles.semOrdensTexto}>📭 Nenhuma ordem aguardando assinatura no momento.</Text>
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
              <TouchableOpacity onPress={() => setAssinaturaVisivel(null)} style={styles.modalCloseBtn}>
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
              <Text style={styles.modalTitleMaps}>Localização do Executante</Text>
              {localSelecionado && (
                <>
                  {localSelecionado?.localizacao && (
                    <Text style={styles.modalEndereco}>{localSelecionado.localizacao}</Text>
                  )}
                  <MapView
                    style={styles.modalMap}
                    initialRegion={{
                      latitude: localSelecionado.latitude,
                      longitude: localSelecionado.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: localSelecionado.latitude,
                        longitude: localSelecionado.longitude,
                      }}
                      title="Executante"
                      description={localSelecionado.localizacao}
                    />
                  </MapView>
                </>
              )}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 8,
  },
  numeroOrdem: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#444",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#007bff",
    marginTop: 4,
  },
  label: {
    fontWeight: "bold",
    color: "#333",
    marginTop: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  assinarButton: {
    flexDirection: "row",
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    height: '50%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalTitleMaps: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalCloseBtn: {
    backgroundColor: '#dc3545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: 'bold',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  semOrdensTexto: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
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



});
