import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Keyboard,
    FlatList,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, getDocs, doc, updateDoc } from "firebase/firestore";

export default function CadastroClienteScreen() {
    const [nome, setNome] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [cep, setCep] = useState("");
    const [numero, setNumero] = useState("");
    const [endereco, setEndereco] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [clientes, setClientes] = useState<any[]>([]);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [clienteEditandoId, setClienteEditandoId] = useState<string | null>(null);


    const formatarCep = (value: string) =>
        value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);

    const formatarCnpj = (value: string) =>
        value
            .replace(/\D/g, "")
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/\.(\d{3})(\d)/, ".$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .slice(0, 18);

    const buscarEnderecoPeloCEP = async () => {
        const cepLimpo = cep.replace(/\D/g, "");

        if (cepLimpo.length !== 8) {
            Alert.alert("CEP inválido", "Digite um CEP com 8 dígitos.");
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (data.erro) {
                Alert.alert("CEP não encontrado");
                return;
            }

            const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
            setEndereco(enderecoCompleto);
        } catch (error) {
            Alert.alert("Erro ao buscar o endereço", String(error));
        }
    };

    const buscarClientes = async () => {
        const snapshot = await getDocs(collection(db, "clientes"));
        const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setClientes(lista);
    };

    useEffect(() => {
        buscarClientes();
    }, []);

    const handleSalvar = async () => {
        if (!nome || !cnpj || !cep || !numero || !endereco) {
            Alert.alert("Preencha todos os campos");
            return;
        }

        try {
            setCarregando(true);

            if (modoEdicao && clienteEditandoId) {
                const ref = doc(db, "clientes", clienteEditandoId);
                await updateDoc(ref, {
                    nome,
                    cnpj,
                    cep,
                    numero,
                    endereco,
                });

                setClientes((prev) =>
                    prev.map((c) =>
                        c.id === clienteEditandoId
                            ? { ...c, nome, cnpj, cep, numero, endereco }
                            : c
                    )
                );

                Alert.alert("Cliente atualizado com sucesso!");
            } else {
                const novoDoc = await addDoc(collection(db, "clientes"), {
                    nome,
                    cnpj,
                    cep,
                    numero,
                    endereco,
                    criadoEm: serverTimestamp(),
                });

                setClientes((prev) => [
                    ...prev,
                    { id: novoDoc.id, nome, cnpj, cep, numero, endereco },
                ]);

                Alert.alert("Cliente cadastrado com sucesso!");
            }

            // Resetar estado
            setNome("");
            setCnpj("");
            setCep("");
            setNumero("");
            setEndereco("");
            setModoEdicao(false);
            setClienteEditandoId(null);
            Keyboard.dismiss();
        } catch (error) {
            Alert.alert("Erro ao salvar", String(error));
        } finally {
            setCarregando(false);
        }
    };


    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {/* 🔒 FORMULÁRIO FIXO */}
            <View style={styles.formulario}>
                <Text style={styles.titulo}>Cadastro de Cliente</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Nome da Empresa"
                    value={nome}
                    onChangeText={setNome}
                />
                <TextInput
                    style={styles.input}
                    placeholder="CNPJ"
                    value={cnpj}
                    onChangeText={(text) => setCnpj(formatarCnpj(text))}
                    keyboardType="numeric"
                />
                <TextInput
                    style={styles.input}
                    placeholder="CEP"
                    value={cep}
                    onChangeText={(text) => setCep(formatarCep(text))}
                    keyboardType="numeric"
                    onBlur={buscarEnderecoPeloCEP}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Número"
                    value={numero}
                    onChangeText={setNumero}
                    keyboardType="numeric"
                />
                <TextInput
                    style={[styles.input, { height: 70 }]}
                    placeholder="Endereço (preenchido pelo CEP)"
                    value={endereco}
                    onChangeText={setEndereco}
                    multiline
                />

                <TouchableOpacity style={styles.botao} onPress={handleSalvar} disabled={carregando}>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                    <Text style={styles.textoBotao}>
                        {carregando
                            ? "Salvando..."
                            : modoEdicao
                                ? "Atualizar Cliente"
                                : "Salvar Cliente"}
                    </Text>
                </TouchableOpacity>


                <Text style={styles.subtitulo}>Clientes Cadastrados</Text>
            </View>

            {/* 📜 LISTA ROLÁVEL */}
            <FlatList
                data={clientes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listaContainer}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.nomeCliente}>{item.nome}</Text>
                        <Text style={styles.textoInfo}>CNPJ: {item.cnpj}</Text>
                        <Text style={styles.textoInfo}>
                            Endereço: {item.endereco}, Nº {item.numero}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setNome(item.nome);
                                setCnpj(item.cnpj);
                                setCep(item.cep);
                                setNumero(item.numero);
                                setEndereco(item.endereco);
                                setModoEdicao(true);
                                setClienteEditandoId(item.id);
                            }}
                            style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                            }}
                        >
                            <Ionicons name="pencil" size={20} color="#2e86de" />
                        </TouchableOpacity>

                    </View>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: "center", marginTop: 20 }}>
                        Nenhum cliente cadastrado ainda.
                    </Text>
                }
                style={{ flex: 1 }}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    formulario: {
        padding: 20,
        backgroundColor: "#f2f2f2",
    },
    titulo: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 15,
        textAlign: "center",
    },
    subtitulo: {
        fontSize: 18,
        marginVertical: 10,
        fontWeight: "bold",
    },
    input: {
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        fontSize: 16,
        elevation: 2,
    },
    botao: {
        flexDirection: "row",
        backgroundColor: "#3498db",
        padding: 14,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        elevation: 3,
        marginTop: 10,
    },
    textoBotao: {
        color: "#fff",
        fontSize: 16,
        marginLeft: 10,
        fontWeight: "bold",
    },
    listaContainer: {
        padding: 20,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        elevation: 2,
    },
    nomeCliente: {
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 5,
    },
    textoInfo: {
        fontSize: 14,
    },
});
