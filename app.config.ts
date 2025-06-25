import { ExpoConfig, ConfigContext } from "@expo/config";
import "dotenv/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "METEST",
    slug: "metest-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],
    plugins: [
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "O app acessa suas fotos para anexar aos chamados.",
        },
      ],
      "expo-build-properties",
    ],
    android: {
      package: "com.metest.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: ["ACCESS_FINE_LOCATION"],
      googleServicesFile: "./google-services.json",
    },
    ios: {
      bundleIdentifier: "com.metest.app",
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Precisamos da sua localização para registrar corretamente o início da ordem de serviço.",
      },
    },
    extra: {
      eas: {
        projectId: "dbce0688-d394-4f88-8a1c-95da81d0d8f2",
      },
      googleServicesJson: process.env.GOOGLE_SERVICES_JSON, 
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
  };
};
