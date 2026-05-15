export type AppStackParamList = {
  MainTabs: undefined;
  Feed: undefined;
  Home: undefined;
  Challenges: undefined;
  Guess: { roundId: string };
  Upload: { draftId?: string } | undefined;
  Drafts: undefined;
  Leaderboard: undefined;
  SentChallenges: undefined;
  History: undefined;
  Friends: { initialTab?: 'followers' | 'following' } | undefined;
  FriendSearch: undefined;
  FriendRequests: undefined;
  FriendStats: { friendId: string; friendName: string };
  Chat: { friendId: string; friendName: string };
  Comments: { postId: string };
  PostDetail: { postId: string };
  Profile: undefined;
  Settings: undefined;
  League: undefined;
  Duels: undefined;
  Duel: { duelId: string };
};

export type AuthStackParamList = {
  Login: undefined;
};
