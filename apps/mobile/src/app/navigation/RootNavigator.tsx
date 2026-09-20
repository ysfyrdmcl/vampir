import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CreateRoomScreen } from "../../screens/CreateRoomScreen";
import { GameOverScreen } from "../../screens/GameOverScreen";
import { JoinRoomScreen } from "../../screens/JoinRoomScreen";
import { LobbyScreen } from "../../screens/LobbyScreen";
import { NightScreen } from "../../screens/NightScreen";
import { RoleRevealScreen } from "../../screens/RoleRevealScreen";
import { VoteScreen } from "../../screens/VoteScreen";
import { WelcomeScreen } from "../../screens/WelcomeScreen";
import { GameLogScreen } from "../../screens/GameLogScreen";
import { GameSettingsScreen } from "../../screens/GameSettingsScreen";
import { RoleGuideScreen } from "../../screens/RoleGuideScreen";
import { RoleCardScreen } from "../../screens/RoleCardScreen";
import { colors } from "../../theme/colors";
import { navigationRef } from "./navigation-ref";
import type { RootStackParamList } from "./routes";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    border: colors.border,
    text: colors.text,
    primary: colors.secondary
  }
};

export function RootNavigator({ onReady, onStateChange }: { onReady: () => void; onStateChange: () => void }) {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={onReady} onStateChange={onStateChange}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: {
            backgroundColor: colors.backgroundDeep
          },
          presentation: "card"
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="RoleGuide" component={RoleGuideScreen} />
        <Stack.Screen name="RoleCard" component={RoleCardScreen} />
        <Stack.Screen name="GameLog" component={GameLogScreen} />
        <Stack.Screen name="GameSettings" component={GameSettingsScreen} />
        <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
        <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
        <Stack.Screen name="Lobby" component={LobbyScreen} />
        <Stack.Screen name="RoleReveal" component={RoleRevealScreen} />
        <Stack.Screen name="Night" component={NightScreen} />
        <Stack.Screen name="Vote" component={VoteScreen} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
