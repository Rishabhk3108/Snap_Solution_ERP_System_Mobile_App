import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import CameraScreen from '../screens/CameraScreen';
import AttendanceHistoryScreen from '../screens/AttendanceHistoryScreen';
import TeamAttendanceScreen from '../screens/TeamAttendanceScreen';
import TeamMembersScreen from '../screens/TeamMembersScreen';
import LeaveScreen from '../screens/LeaveScreen';
import SalaryScreen from '../screens/SalaryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingNavigator from './OnboardingNavigator';

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  const isManager = user?.role === 'ROLE_MANAGER' || user?.role === 'ROLE_ADMIN';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            MyTeam: focused ? 'people' : 'people-outline',
            Attendance: focused ? 'calendar' : 'calendar-outline',
            Leave: focused ? 'document-text' : 'document-text-outline',
            Salary: focused ? 'cash' : 'cash-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      {isManager && (
        <Tab.Screen name="MyTeam" component={TeamAttendanceScreen} options={{ tabBarLabel: 'My Team' }} />
      )}
      <Tab.Screen name="Attendance" component={AttendanceHistoryScreen} options={{ tabBarLabel: 'Attendance' }} />
      <Tab.Screen name="Leave" component={LeaveScreen} options={{ tabBarLabel: 'Leave' }} />
      <Tab.Screen name="Salary" component={SalaryScreen} options={{ tabBarLabel: 'Salary' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.onboarding_complete ? (
            <>
              <RootStack.Screen name="Tabs" component={MainTabs} />
              <RootStack.Screen name="TeamMembers" component={TeamMembersScreen} />
              <RootStack.Screen
                name="Camera"
                component={CameraScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
            </>
          ) : (
            <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
          )
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
