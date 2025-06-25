import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider } from "./context/AuthContext";

import { RootStackParamList } from "types/types";
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

export default function App() {
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
