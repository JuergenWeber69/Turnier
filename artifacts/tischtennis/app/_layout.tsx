import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather, Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppDialogHost } from "@/components/AppDialogHost";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TournamentProvider } from "@/context/TournamentContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function getFontUri(fontSource: unknown): string | null {
  if (typeof fontSource === "string") {
    return fontSource;
  }

  if (fontSource && typeof fontSource === "object" && "uri" in fontSource) {
    const uri = (fontSource as { uri?: unknown }).uri;
    return typeof uri === "string" ? uri : null;
  }

  return null;
}

function ensureWebIconFonts() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById("tischtennis-icon-fonts")) return;

  const ioniconsUri = getFontUri(Ionicons.font.ionicons);
  const featherUri = getFontUri(Feather.font.feather);
  const rules = [
    ioniconsUri
      ? `@font-face{font-family:ionicons;src:url("${ioniconsUri}") format("truetype");font-display:block;}`
      : "",
    featherUri
      ? `@font-face{font-family:feather;src:url("${featherUri}") format("truetype");font-display:block;}`
      : "",
  ].join("");

  if (!rules) return;

  const style = document.createElement("style");
  style.id = "tischtennis-icon-fonts";
  style.textContent = rules;
  document.head.appendChild(style);
}

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="ko"
        options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="doubles"
        options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="help"
        options={{ headerShown: false, presentation: "card", animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    ensureWebIconFonts();

    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <TournamentProvider>
                <RootLayoutNav />
                <AppDialogHost />
              </TournamentProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
