// ============================================================
// ResumeAI React Native App - 入口
// ============================================================
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Provider as ToastProvider } from 'react-native-toast-message';

// 屏幕
import HomeScreen from './src/screens/HomeScreen';
import DiscoverScreen from './src/screens/DiscoverScreen';
import CreateScreen from './src/screens/CreateScreen';
import MyResumesScreen from './src/screens/MyResumesScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// 全局状态
import { useAuthStore } from './src/store';

const Tab = createBottomTabNavigator();

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Discover') iconName = focused ? 'compass' : 'compass-outline';
            else if (route.name === 'Create') iconName = focused ? 'add-circle' : 'add-circle-outline';
            else if (route.name === 'MyResumes') iconName = focused ? 'document-text' : 'document-text-outline';
            else iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6366F1',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: { paddingBottom: 4, height: 56 },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
        <Tab.Screen name="Discover" component={DiscoverScreen} options={{ title: '发现' }} />
        <Tab.Screen name="Create" component={CreateScreen} options={{ title: '创建' }} />
        <Tab.Screen name="MyResumes" component={MyResumesScreen} options={{ title: '简历' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '个人' }} />
      </Tab.Navigator>
      <ToastProvider />
    </NavigationContainer>
  );
}
