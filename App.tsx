// App.tsx
import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";

import { AuthProvider } from "./context/AuthContext";
import registerForPushNotifications from "./services/registerForPushNotifications";
import { saveExpoPushToken } from "./services/pushTokenStorage";

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="LoginScreen"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="InicialScreen"
            component={InicialScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrdemScreen"
            component={OrdemScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="VisualizarScreen"
            component={VisualizarScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="FinalizarScreen"
            component={FinalizarScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="FinalizadasScreen"
            component={FinalizadasScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="AssinaturaScreen"
            component={AssinaturaScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="CadastroScreen"
            component={CadastroScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
          <Stack.Screen
            name="AdminPainelScreen"
            component={AdminPainelScreen}
            options={{
              headerShown: true,
              headerBackTitle: "Voltar",
              title: "",
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
