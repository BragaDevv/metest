import { ExpoConfig, ConfigContext } from "@expo/config";

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
    },
    ios: {
      bundleIdentifier: "com.metest.app",
      supportsTablet: true,
    },
    extra: {},
    runtimeVersion: {
      policy: "sdkVersion",
    },
  };
};
