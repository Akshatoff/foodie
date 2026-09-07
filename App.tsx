import "react-native-gesture-handler";
import React, { useEffect, useRef } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import NetInfo from "@react-native-community/netinfo";
import RootNavigator from "@/navigation/RootNavigator";
import { processPendingQueue } from "@/services/queueProcessor";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0F172A",
    card: "#0F172A",
    primary: "#22C55E",
  },
};

export default function App() {
  // Tracks the previous connectivity state so we only trigger processing
  // on an actual offline->online TRANSITION, not on every network event
  // (NetInfo fires fairly often - e.g. switching wifi access points).
  const wasOnline = useRef<boolean | null>(null);

  useEffect(() => {
    // Catch anything left in the queue from a previous session (app was
    // killed while offline, or force-closed mid-retry) as soon as we
    // launch with a connection.
    processPendingQueue();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      if (isOnline && wasOnline.current === false) {
        processPendingQueue();
      }
      wasOnline.current = isOnline;
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
