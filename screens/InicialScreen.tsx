import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/types";
import { Ionicons } from "@expo/vector-icons";

export default function TelaInicial() {
  const { user, tipo, logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "LoginScreen" }] });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo-metest.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Bem-vindo à METEST</Text>
      <Text style={styles.info}>Olá, {user?.email}</Text>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("OrdemScreen")}
        >
          <Ionicons
            name="add-circle-outline"
            size={24}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.menuText}>Abrir Ordem de Serviço</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("VisualizarScreen")}
        >
          <Ionicons
            name="document-text-outline"
            size={24}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.menuText}>Visualizar Ordens</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => navigation.navigate("FinalizadasScreen")}
      >
        <Ionicons
          name="checkmark-done-outline"
          size={24}
          color="#fff"
          style={styles.icon}
        />
        <Text style={styles.menuText}>Ordens Finalizadas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#fff"
          style={styles.icon}
        />
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 20,
  },
  logo: {
    width: 180,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  info: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
  },
  menu: {
    marginTop: 30,
    width: "100%",
    alignItems: "center",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginVertical: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  menuText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  icon: {
    marginRight: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    backgroundColor: "#e6501e",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
