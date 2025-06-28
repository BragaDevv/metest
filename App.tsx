// App.tsx
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { RootStackParamList } from "./types/types";

import LoginScreen from "./screens/LoginScreen";
import InicialScreen from "./screens/InicialScreen";
import OrdemScreen from "./screens/OrdemScreen";
import VisualizarScreen from "./screens/VisualizarScreen";
import FinalizarScreen from "@screens/FinalizarScreen";
import FinalizadasScreen from "@screens/FinalizadasScreen";
import AssinaturaScreen from "@screens/AssinaturaScreen";
import CadastroScreen from "@screens/CadastroScreen";
import AdminPainelScreen from "@screens/AdminPainelScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

// ✅ Configuração de linking para suportar histórico do navegador
const linking = {
  prefixes: ["http://localhost:8081", "https://seuapp.com"],
  config: {
    screens: {
      LoginScreen: "login",
      InicialScreen: "inicial",
      OrdemScreen: "ordem",
      VisualizarScreen: "visualizar",
      FinalizarScreen: "finalizar",
      FinalizadasScreen: "finalizadas",
      AssinaturaScreen: "assinatura",
      CadastroScreen: "cadastro",
      AdminPainelScreen: "admin",
    },
  },
};

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const StackScreens = () => (
    <Stack.Navigator>
      {!user || !tipo ? (
        <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="InicialScreen"
            component={InicialScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrdemScreen"
            component={OrdemScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="VisualizarScreen"
            component={VisualizarScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="FinalizarScreen"
            component={FinalizarScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="FinalizadasScreen"
            component={FinalizadasScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="AssinaturaScreen"
            component={AssinaturaScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="CadastroScreen"
            component={CadastroScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
          <Stack.Screen
            name="AdminPainelScreen"
            component={AdminPainelScreen}
            options={{ headerShown: Platform.OS !== "web", title: "" }}
          />
        </>
      )}
    </Stack.Navigator>
  );

  return (
    <NavigationContainer
      linking={linking}
      fallback={<Text>Carregando...</Text>}
    >
      <StackScreens />
    </NavigationContainer>
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

      notificationListener.current =
        Notifications.addNotificationReceivedListener((notification) => {
          Toast.show({
            type: "info",
            text1: notification.request.content.title ?? "Nova notificação",
            text2: notification.request.content.body ?? "",
          });
        });

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
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
      <AppContent />
    </AuthProvider>
  );
}
