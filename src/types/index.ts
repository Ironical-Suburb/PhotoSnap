export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  backup_enabled?: boolean;
  push_token?: string;
  current_streak?: number;
  longest_streak?: number;
  last_post_date?: string | null;
};

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export type Friendship = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendshipStatus;
  created_at: string;
};

export type FriendWithProfile = Friendship & {
  other_user: User;
};

export type ChallengeType = 'date' | 'location' | 'both' | 'none';

export type Photo = {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  storage_url: string;
  actual_date?: string | null;
  caption?: string;
  created_at: string;
  is_post?: boolean;
  challenge_type?: ChallengeType;
  location_lat?: number | null;
  location_lon?: number | null;
  location_hint?: string | null;
};

export type Round = {
  id: string;
  photo_id: string;
  guesser_id: string;
  guess_date: string | null;
  guess_location: string | null;
  score: number | null;
  resolved_at: string | null;
  created_at: string;
};

export type PostLike = {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
};

export type PostReaction = {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

export type DailyMoment = {
  id: string;
  triggered_at: string;
  expires_at: string;
  is_active: boolean;
};

export type FeedPost = Photo & {
  sender: Pick<User, 'id' | 'display_name' | 'avatar_url' | 'current_streak'>;
  post_likes: PostLike[];
  post_reactions: PostReaction[];
};

export type DuelStatus = 'pending' | 'active' | 'complete' | 'rejected';

export type Duel = {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenger_photo_id: string | null;
  opponent_photo_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  status: DuelStatus;
  created_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  total_score: number;
  rounds_played: number;
};

export type ScoreTier = {
  maxDaysOff: number;
  points: number;
  label: string;
};
