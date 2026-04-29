export type AppStackParamList = {
  Home: undefined;
  Challenges: undefined;
  Guess: { roundId: string };
  Upload: undefined;
  Leaderboard: undefined;
  SentChallenges: undefined;
  History: undefined;
  Friends: undefined;
  FriendSearch: undefined;
  FriendRequests: undefined;
  FriendStats: { friendId: string; friendName: string };
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};
