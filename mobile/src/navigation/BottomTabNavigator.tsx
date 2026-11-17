import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { PublicMatchesScreen } from '../screens/public/PublicMatchesScreen';
import { PlayersScreen } from '../screens/players/PlayersScreen';
import { CoachScreen } from '../screens/coach/CoachScreen';
import { MyMatchesScreen } from '../screens/matches/MyMatchesScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Globe, Users, Bot, Video, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        },
        headerTintColor: '#0f172a',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 16,
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="PublicMatches"
        component={PublicMatchesScreen}
        options={{
          title: 'Khám phá',
          headerTitle: 'BadmintonAI Platform',
          tabBarIcon: ({ color, size }) => <Globe color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersScreen}
        options={{
          title: 'Tuyển thủ',
          headerTitle: 'Vận Động Viên Hàng Đầu',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Coach"
        component={CoachScreen}
        options={{
          title: 'HLV AI',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
          tabBarActiveTintColor: '#059669',
        }}
      />
      <Tab.Screen
        name="MyMatches"
        component={MyMatchesScreen}
        options={{
          title: 'Trận của tôi',
          headerTitle: 'Trận Đấu Cá Nhân',
          tabBarIcon: ({ color, size }) => <Video color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          headerTitle: 'Hồ Sơ Của Bạn',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />
    </Tab.Navigator>
  );
};
