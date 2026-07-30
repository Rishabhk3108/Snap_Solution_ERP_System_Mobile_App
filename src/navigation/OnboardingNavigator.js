import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import PersonalDetailsScreen from '../screens/onboarding/PersonalDetailsScreen';
// Face enrollment (temporarily disabled — location-only check-in/out for now).
// Re-enable by uncommenting these two imports and the two Stack.Screen entries below.
// import FaceEnrollScreen from '../screens/onboarding/FaceEnrollScreen';
// import FaceTestScreen from '../screens/onboarding/FaceTestScreen';
import SuccessScreen from '../screens/onboarding/SuccessScreen';

const Stack = createStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="OB_Welcome" component={WelcomeScreen} />
      <Stack.Screen name="OB_PersonalDetails" component={PersonalDetailsScreen} />
      {/* <Stack.Screen name="OB_FaceEnroll" component={FaceEnrollScreen} /> */}
      {/* <Stack.Screen name="OB_FaceTest" component={FaceTestScreen} /> */}
      <Stack.Screen name="OB_Success" component={SuccessScreen} />
    </Stack.Navigator>
  );
}
