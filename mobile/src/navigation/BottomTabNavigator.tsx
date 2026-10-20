import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { PublicMatchesScreen } from '../screens/public/PublicMatchesScreen';
import { MyMatchesScreen } from '../screens/matches/MyMatchesScreen';
import { CreateMatchScreen } from '../screens/matches/CreateMatchScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { Globe, Video, PlusCircle, User } from 'lucide-react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0b1424',
          borderBottomWidth: 1,
          borderBottomColor: '#1e3a5f',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: '#0b1424',
          borderTopWidth: 1,
          borderTopColor: '#1e3a5f',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="PublicMatches"
        component={PublicMatchesScreen}
        options={{
          title: 'Khám phá',
          headerTitle: 'Badminton AI Platform',
          tabBarIcon: ({ color, size }) => <Globe color={color} size={size - 2} />,
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
        name="CreateMatchTab"
        component={CreateMatchScreen}
        options={{
          title: 'Tạo mới',
          headerTitle: 'Tạo Trận Đấu Mới',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={size - 2} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Hồ sơ',
          headerTitle: 'Hồ Sơ Của Bạn',
          tabBarIcon: ({ color, size }) => <User color={color} size={size - 2} />,
        }}
      />
    </Tab.Navigator>
  );
};

