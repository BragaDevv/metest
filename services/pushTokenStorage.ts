import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { getAuth } from "firebase/auth";

function generateRandomId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync("device_id");
  if (!deviceId) {
    deviceId = generateRandomId();
    console.log("[TOKEN] Gerando novo device_id:", deviceId);
    await SecureStore.setItemAsync("device_id", deviceId);
  } else {
    console.log("[TOKEN] device_id existente encontrado:", deviceId);
  }
  return deviceId;
}

function isValidExpoPushToken(token: string): boolean {
  return typeof token === "string" && token.startsWith("ExponentPushToken[");
}

export async function saveExpoPushToken(token: string, extraData: Record<string, any> = {}) {
  try {
    console.log("[TOKEN] Iniciando salvamento de token...");

    if (!isValidExpoPushToken(token)) {
      console.warn("[TOKEN] Token inválido, não será salvo:", token);
      return;
    }

    const deviceId = await getDeviceId();

    const dataToSave = {
      updatedAt: serverTimestamp(),
      platform: Platform.OS || "unknown",
      deviceName: Device.deviceName?.toString().slice(0, 50) || "Desconhecido",
      deviceId,
      ...extraData,
    };

    const user = getAuth().currentUser;
    if (!user || !user.uid) {
      console.warn("[TOKEN] Usuário não autenticado. Token não será salvo.");
      return;
    }

    await setDoc(doc(db, "usuarios", user.uid), {
      expoPushToken: token,
      ...dataToSave,
    }, { merge: true });

    console.log("[TOKEN] Token salvo com sucesso para UID:", user.uid);
  } catch (error) {
    console.error("[TOKEN] Erro ao salvar token:", error);
  }
}

export { getDeviceId };
