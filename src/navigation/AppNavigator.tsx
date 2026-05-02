import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/game/HomeScreen';
import ChallengesScreen from '../screens/game/ChallengesScreen';
import GuessScreen from '../screens/game/GuessScreen';
import UploadScreen from '../screens/game/UploadScreen';
import DraftsScreen from '../screens/game/DraftsScreen';
import SentChallengesScreen from '../screens/game/SentChallengesScreen';
import HistoryScreen from '../screens/game/HistoryScreen';
import LeaderboardScreen from '../screens/game/LeaderboardScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import FriendSearchScreen from '../screens/friends/FriendSearchScreen';
import FriendRequestsScreen from '../screens/friends/FriendRequestsScreen';
import FriendStatsScreen from '../screens/friends/FriendStatsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import type { AppStackParamList } from './types';
import { C } from '../theme';

const Stack = createNativeStackNavigator<AppStackParamList>();

const darkHeader = {
  headerShown: true,
  headerStyle: { backgroundColor: C.bg },
  headerTintColor: C.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
      <Stack.Screen name="Guess" component={GuessScreen} options={{ ...darkHeader, title: '' }} />
      <Stack.Screen name="Upload" component={UploadScreen} />
      <Stack.Screen name="Drafts" component={DraftsScreen} options={{ ...darkHeader, title: 'Drafts' }} />
      <Stack.Screen name="SentChallenges" component={SentChallengesScreen} options={{ ...darkHeader, title: 'Sent Challenges' }} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ ...darkHeader, title: 'History' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ ...darkHeader, title: 'Leaderboard' }} />
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="FriendSearch" component={FriendSearchScreen} options={{ ...darkHeader, title: 'Find Friends' }} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} options={{ ...darkHeader, title: 'Friend Requests' }} />
      <Stack.Screen
        name="FriendStats"
        component={FriendStatsScreen}
        options={({ route }) => ({ ...darkHeader, title: `vs ${route.params.friendName}` })}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
