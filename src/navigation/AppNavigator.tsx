import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/game/HomeScreen';
import GuessScreen from '../screens/game/GuessScreen';
import UploadScreen from '../screens/game/UploadScreen';
import LeaderboardScreen from '../screens/game/LeaderboardScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import FriendSearchScreen from '../screens/friends/FriendSearchScreen';
import FriendRequestsScreen from '../screens/friends/FriendRequestsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Guess" component={GuessScreen} options={{ headerShown: true, title: 'Make Your Guess' }} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ headerShown: true, title: 'Upload a Memory' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, title: 'Leaderboard' }} />
      <Stack.Screen name="Friends" component={FriendsScreen} options={{ headerShown: true, title: 'Friends' }} />
      <Stack.Screen name="FriendSearch" component={FriendSearchScreen} options={{ headerShown: true, title: 'Find Friends' }} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ headerShown: true, title: 'Friend Requests' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
    </Stack.Navigator>
  );
}
