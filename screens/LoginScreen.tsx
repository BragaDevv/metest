import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import registerForPushNotifications from "../services/registerForPushNotifications";
import { saveExpoPushToken } from "../services/pushTokenStorage";
import { auth } from "firebaseConfig";

export default function LoginScreen() {
  const { login, loading, tipo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const jaRedirecionou = useRef(false);

  useEffect(() => {
    if (tipo && !jaRedirecionou.current) {
      jaRedirecionou.current = true;
      navigation.replace("InicialScreen");
    }
  }, [tipo]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );
      console.log("✅ Login realizado:", userCredential.user.uid);

      const token = await registerForPushNotifications();
      if (token) {
        await saveExpoPushToken(token);
      }

      setErro("");
      // Agora o redirecionamento ocorre automaticamente no useEffect após tipo carregar
    } catch (error: any) {
      console.error("Erro ao logar:", error);
      let mensagem = "Erro ao tentar fazer login.";
      if (error.code === "auth/user-not-found") mensagem = "Usuário não encontrado.";
      else if (error.code === "auth/wrong-password") mensagem = "Senha incorreta.";
      else if (error.code === "auth/invalid-email") mensagem = "E-mail inválido.";
      else if (error.code === "auth/too-many-requests") mensagem = "Muitas tentativas. Tente novamente mais tarde.";

      setErro(mensagem);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require("../assets/images/logo-metest.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Bem-vindo à METEST</Text>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Entrando..." : "Entrar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    ...(Platform.OS === "web" && {
      maxWidth: 400,
      width: "100%",
      alignSelf: "center",
      marginTop: 60,
      marginBottom: 60,
    }),
  },
  logo: {
    width: Platform.OS === "web" ? 250 : 200,
    height: Platform.OS === "web" ? 150 : 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#e6501e",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  erro: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
});
