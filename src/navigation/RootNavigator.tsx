import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/types";
import HomeScreen from "@/screens/HomeScreen";
import CameraScreen from "@/screens/CameraScreen";
import ResultsScreen from "@/screens/ResultsScreen";
import ManualEntryScreen from "@/screens/ManualEntryScreen";
import GoalsScreen from "@/screens/GoalsScreen";
import ProgressScreen from "@/screens/ProgressScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import CorrectionSettingsScreen from "@/screens/CorrectionSettingsScreen";
import PendingQueueScreen from "@/screens/PendingQueueScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0F172A" },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen
        name="ManualEntry"
        component={ManualEntryScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen
        name="CorrectionSettings"
        component={CorrectionSettingsScreen}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="PendingQueue" component={PendingQueueScreen} />
    </Stack.Navigator>
  );
}
