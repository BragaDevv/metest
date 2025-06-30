import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { RootStackParamList } from "./types/types";

import LoginScreen from "./screens/LoginScreen";
import InicialScreen from "./screens/InicialScreen";
import RelatorioFotograficoScreen from "./screens/RelatorioFotograficoScreen";
import VisualizarScreen from "./screens/VisualizarScreen";
import FinalizarScreen from "@screens/FinalizarScreen";
import FinalizadasScreen from "@screens/FinalizadasScreen";
import AssinaturaScreen from "@screens/AssinaturaScreen";
import CadastroScreen from "@screens/CadastroScreen";
import CadastroClienteScreen from "@screens/CadastroClienteScreen";
import AdminPainelScreen from "@screens/AdminPainelScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

// 🔗 Deep linking config
const linking = {
  prefixes: ["http://localhost:8081", "https://seuapp.com"],
  config: {
    screens: {
      LoginScreen: "login",
      InicialScreen: "inicial",
      RelatorioFotograficoScreen: "ordem",
      VisualizarScreen: "visualizar",
      FinalizarScreen: "finalizar",
      FinalizadasScreen: "finalizadas",
      AssinaturaScreen: "assinatura",
      CadastroScreen: "cadastro",
      CadastroClienteScreen: "cadastroCliente",
      AdminPainelScreen: "admin",
    },
  },
};

// 🔔 Configuração global das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AppContent = () => {
  const { user, tipo, loading } = useAuth();

  // Aguarde carregamento completo do usuário e do tipo
  if (loading || (user && !tipo)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: Platform.OS !== "web", title: "" }}>
      {!user ? (
        <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
      ) : (
        <>
          <Stack.Screen name="InicialScreen" component={InicialScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RelatorioFotograficoScreen" component={RelatorioFotograficoScreen} />
          <Stack.Screen name="VisualizarScreen" component={VisualizarScreen} />
          <Stack.Screen name="FinalizarScreen" component={FinalizarScreen} />
          <Stack.Screen name="FinalizadasScreen" component={FinalizadasScreen} />
          <Stack.Screen name="AssinaturaScreen" component={AssinaturaScreen} />
          <Stack.Screen name="CadastroScreen" component={CadastroScreen} />
          <Stack.Screen name="CadastroClienteScreen" component={CadastroClienteScreen} />
          <Stack.Screen name="AdminPainelScreen" component={AdminPainelScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};


export default function App() {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
        Toast.show({
          type: "info",
          text1: notification.request.content.title ?? "Nova notificação",
          text2: notification.request.content.body ?? "",
        });
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("[APP] Notificação clicada:", response);
      });

      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    };

    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer linking={linking} fallback={<Text>Carregando...</Text>}>
        <AppContent />
      </NavigationContainer>
    </AuthProvider>
  );
}
