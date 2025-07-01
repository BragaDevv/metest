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
  ScrollView,
} from "react-native";
import { MaskedTextInput } from "react-native-mask-text";

import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function CadastroClienteScreen() {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [endereco, setEndereco] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [clienteEditandoId, setClienteEditandoId] = useState<string | null>(
    null
  );
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [busca, setBusca] = useState("");

  const formatarCep = (value: string) =>
    value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);

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
      const response = await fetch(
        `https://viacep.com.br/ws/${cepLimpo}/json/`
      );
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
          contato,
          telefone,
          email,
        });

        setClientes((prev) =>
          prev.map((c) =>
            c.id === clienteEditandoId
              ? {
                  ...c,
                  nome,
                  cnpj,
                  cep,
                  numero,
                  endereco,
                  contato,
                  telefone,
                  email,
                }
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
          contato,
          telefone,
          email,
          criadoEm: serverTimestamp(),
        });

        setClientes((prev) => [
          ...prev,
          {
            id: novoDoc.id,
            nome,
            cnpj,
            cep,
            numero,
            endereco,
            contato,
            telefone,
            email,
          },
        ]);

        Alert.alert("Cliente cadastrado com sucesso!");
      }

      // Resetar estado
      setNome("");
      setCnpj("");
      setCep("");
      setNumero("");
      setEndereco("");
      setContato("");
      setTelefone("");
      setEmail("");
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.formulario, { flexGrow: 1 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Cadastro de Cliente</Text>

        {/* FORMULÁRIO */}
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
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="CEP"
            value={cep}
            onChangeText={(text) => setCep(formatarCep(text))}
            keyboardType="numeric"
            onBlur={buscarEnderecoPeloCEP}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Número"
            value={numero}
            onChangeText={setNumero}
            keyboardType="numeric"
          />
        </View>
        <TextInput
          style={[styles.input, { height: 70 }]}
          placeholder="Endereço (preenchido pelo CEP)"
          value={endereco}
          onChangeText={setEndereco}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Nome do Contato"
          value={contato}
          onChangeText={setContato}
        />
        <MaskedTextInput
          style={styles.input}
          mask="(99) 99999-9999"
          placeholder="Telefone"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={(text, rawText) => setTelefone(rawText)}
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={handleSalvar}
          disabled={carregando}
        >
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

        {/* CAMPO DE BUSCA */}
        <TextInput
          style={[styles.input, { marginTop: 10 }]}
          placeholder="Buscar cliente por nome..."
          value={busca}
          onChangeText={setBusca}
        />

        {/* LISTA DE CLIENTES */}
        {clientes
          .filter((cliente) =>
            cliente.nome.toLowerCase().includes(busca.toLowerCase())
          )
          .map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.nomeCliente}>{item.nome}</Text>
              <Text style={styles.textoInfo}>CNPJ: {item.cnpj}</Text>
              <Text style={styles.textoInfo}>
                Endereço: {item.endereco}, Nº {item.numero}
              </Text>
              <Text style={styles.textoInfo}>Contato: {item.contato}</Text>
              <Text style={styles.textoInfo}>Tel: {item.telefone}</Text>
              <Text style={styles.textoInfo}>Email: {item.email}</Text>

              <TouchableOpacity
                onPress={() => {
                  setNome(item.nome);
                  setCnpj(item.cnpj);
                  setCep(item.cep);
                  setNumero(item.numero);
                  setEndereco(item.endereco);
                  setContato(item.contato || "");
                  setTelefone(item.telefone || "");
                  setEmail(item.email || "");
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
          ))}

        {clientes.length === 0 && (
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            Nenhum cliente cadastrado ainda.
          </Text>
        )}
      </ScrollView>
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
