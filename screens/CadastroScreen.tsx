import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@context/AuthContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";

export default function CadastroScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { tipo } = useAuth();

  const handleCadastro = async () => {
    if (!nome || !usuario || !senha || !confirmarSenha) {
      Alert.alert("Preencha todos os campos");
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("As senhas não coincidem");
      return;
    }

    const emailCompleto = `${usuario}@metest.com`;

    setCarregando(true);
    const auth = getAuth();

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        emailCompleto,
        senha
      );
      const uid = cred.user.uid;

      await setDoc(doc(db, "usuarios", uid), {
        nome,
        email: emailCompleto,
        criadoEm: new Date(),
      });

      Alert.alert("✅ Cadastro realizado com sucesso!");
      setNome("");
      setUsuario("");
      setSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert(
          "Erro",
          "Este e-mail já está em uso. Tente outro nome de usuário."
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.titulo}>Criar Conta - Usuário</Text>

        <TextInput
          placeholder="Nome completo"
          style={styles.input}
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          placeholder="Usuário"
          style={styles.input}
          value={usuario}
          onChangeText={(text) => setUsuario(text.replace("@metest.com", ""))}
          autoCapitalize="none"
        />
        <Text style={styles.emailPreview}>
          Email usado: {usuario ? `${usuario}@metest.com` : "..."}
        </Text>

        <TextInput
          placeholder="Senha"
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />
        <TextInput
          placeholder="Confirmar senha"
          style={styles.input}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={handleCadastro}
          disabled={carregando}
        >
          <Text style={styles.botaoTexto}>
            {carregando ? "Cadastrando..." : "Criar Conta"}
          </Text>
        </TouchableOpacity>

        {tipo === "adm" && (
          <TouchableOpacity
            onPress={() => navigation.navigate("AdminPainelScreen")}
            style={styles.botaoPainel}
          >
            <Text style={styles.botaoTextoPainel}>🔐 Painel ADM</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
    textShadowColor: "#d0dff9",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#cce0ff",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  emailPreview: {
    alignSelf: "flex-start",
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 16,
    color: "#555",
  },
  botao: {
    backgroundColor: "#005eff",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    width: "100%",
    alignItems: "center",
    shadowColor: "#005eff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  botaoPainel: {
    backgroundColor: "#333",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  botaoTextoPainel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

