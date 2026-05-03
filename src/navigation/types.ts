export type AppStackParamList = {
  Feed: undefined;
  Home: undefined;
  Challenges: undefined;
  Guess: { roundId: string };
  Upload: { draftId?: string } | undefined;
  Drafts: undefined;
  Leaderboard: undefined;
  SentChallenges: undefined;
  History: undefined;
  Friends: undefined;
  FriendSearch: undefined;
  FriendRequests: undefined;
  FriendStats: { friendId: string; friendName: string };
  Chat: { friendId: string; friendName: string };
  Profile: undefined;
  League: undefined;
  Duels: undefined;
  Duel: { duelId: string };
};

export type AuthStackParamList = {
  Login: undefined;
};
