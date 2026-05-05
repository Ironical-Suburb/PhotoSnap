# PhotoSnap

A social photo app where friends challenge each other to guess when (and where) a photo was taken. Post memories to your feed, send private challenges, react to friends' photos, and climb the accuracy league.

## How it works

1. Upload a photo and set the date (and optionally the location) it was taken.
2. Post it to your feed for all friends to guess, or send it as a private challenge.
3. Friends see the photo and use a date/location picker to make their guess.
4. A score is awarded based on how close the guess is.
5. Scores accumulate across leagues, streaks, and head-to-head duels.

## Scoring

| Accuracy | Points |
|---|---|
| Exact day | 1000 |
| Within 1 week | 800 |
| Within 1 month | 500 |
| Within 3 months | 300 |
| Within 1 year | 100 |
| More than 1 year off | 0 |

## Features

### Social feed
- Instagram-style feed with a stories strip showing active friends and the Daily Moment
- Full-width 4:5 photo posts with emoji reactions (🔥 😂 😮 💀)
- Tap a friend's name or avatar to view their profile and head-to-head stats
- 24-hour expiry on challenges with countdown timers
- Daily Moment — a timed event where everyone posts at the same time

### Navigation
- Swipe horizontally between Feed, Inbox, Friends, and Profile tabs
- Bottom tab bar with badge counts for pending challenges

### Profile (Instagram-style)
- Large avatar with one-tap photo editing
- Stats row: Posts · Friends · Streak
- 3-column grid of all your posts
- Inline display name editing
- Settings screen for account info, encryption key backup, and sign out

### Challenges & Inbox
- Pending photo challenges listed with sender and received date
- Unread DMs shown at the top of the inbox
- Direct messaging between friends

### Friends
- Friend search by display name
- Friend requests with badge notifications
- Real avatar photos in friend list rows
- One-tap chat, duel challenge, or remove

### Competition
- **Accuracy League** — Bronze / Silver / Gold / Platinum / Diamond tiers based on average score
- **Head-to-head Duels** — challenge a friend, both upload a photo, highest score wins
- **Streaks** — daily posting streak shown on your profile and feed cards
- Leaderboard across all rounds

### Privacy & security
- End-to-end photo encryption — photos are encrypted on-device before upload
- Encryption key backup to account (optional) for multi-device restore
- Signed URLs for photo access — no public photo links

### Authentication
- Email + password sign-up with 6-digit OTP email confirmation
- In-app OTP verification screen (no deep links required)
- Push notifications for new challenges and messages

## Tech stack

- **Expo SDK 55 (React Native)** — iOS and Android from a single codebase
- **Supabase** — authentication, Postgres database, file storage, row-level security
- **react-native-pager-view** — native swipe tab navigation
- **React Navigation** — stack navigator for sub-screens
- **expo-image-picker** — camera roll access and avatar upload
- **base64-arraybuffer** — client-side photo encryption
- **@react-native-firebase/messaging** — push notification tokens

## Project structure

```
src/
  components/     TabBar, EncryptedImage
  lib/            Supabase client, crypto, notifications
  navigation/     Stack navigator and route type definitions
  screens/
    auth/         Login, OTP verification
    chat/         Direct messaging
    friends/      Friend list, search, requests, stats
    game/         Feed, upload, guess, challenges, history,
                  leaderboard, league, duels
    profile/      Profile (Instagram grid), settings, first-time setup
  types/          Shared TypeScript types
supabase/
  migration_apply_all.sql   All migrations in one file (safe to re-run)
  schema.sql                Full database schema with RLS policies
```

## Getting started

### 1. Supabase setup

- Create a project at [supabase.com](https://supabase.com).
- Run `supabase/migration_apply_all.sql` in the Supabase SQL editor.
- In **Authentication → Email → Templates**, edit the "Confirm signup" template to include `{{ .Token }}` so users receive a 6-digit OTP code.

### 2. Environment variables

Copy `.env.example` to `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the app

```bash
npm install
npx expo start
```

> **Note:** The app uses `@react-native-firebase/messaging` which is a native module and cannot run in Expo Go. Use a custom dev client or build the APK directly.

**Build a local APK (no Expo account needed):**

```bash
cd android
.\gradlew assembleRelease
```

APK output: `android/app/build/outputs/apk/release/app-release.apk`

## Database schema

| Table | Purpose |
|---|---|
| `users` | Profiles — display name, avatar, streak, push token |
| `friendships` | Friend requests and accepted connections |
| `photos` | Uploaded photos with encrypted storage path and actual date |
| `rounds` | Each guess attempt with score once resolved |
| `messages` | Direct messages between friends |
| `post_likes` | Likes on feed posts |
| `post_reactions` | Emoji reactions on feed posts |
| `duels` | Head-to-head duel challenges between two users |
| `daily_moments` | Active daily moment windows |

Row-level security is enabled on all tables. The actual date of a photo is never exposed to the guesser before they submit.
