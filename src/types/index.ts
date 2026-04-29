export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
};

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export type Friendship = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendshipStatus;
  created_at: string;
};

// Friendship row joined with the other user's profile
export type FriendWithProfile = Friendship & {
  other_user: User;
};

export type Photo = {
  id: string;
  sender_id: string;
  receiver_id: string;
  storage_url: string;
  actual_date: string; // ISO date — never exposed to the guesser before resolving
  caption?: string;
  created_at: string;
};

export type Round = {
  id: string;
  photo_id: string;
  guesser_id: string;
  guess_date: string | null;
  score: number | null;
  resolved_at: string | null;
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
