import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { BottomTabNavigator } from './BottomTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MatchReplayScreen } from '../screens/replay/MatchReplayScreen';
import { MatchStatisticsScreen } from '../screens/stats/MatchStatisticsScreen';
import { CreateMatchScreen } from '../screens/matches/CreateMatchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0b1424',
        },
        headerTintColor: '#ffffff',
        contentStyle: {
          backgroundColor: '#0b1424',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="MatchReplay"
        component={MatchReplayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MatchStatistics"
        component={MatchStatisticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{
          title: 'Tạo Trận Đấu Mới',
          headerBackTitle: 'Quay lại',
        }}
      />
    </Stack.Navigator>
  );
};

