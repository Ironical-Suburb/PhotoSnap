# PhotoSnap

A mobile app where friends challenge each other to guess when a photo was taken. Upload a memory, send it to a friend, and see how close they can get to the real date.

## How it works

1. Upload a photo and set the date it was taken.
2. Choose a friend to send the challenge to.
3. Your friend sees the photo and picks a date.
4. A score is awarded based on how close the guess is.
5. Scores accumulate on a shared leaderboard.

## Scoring

| Accuracy | Points |
|---|---|
| Exact day | 1000 |
| Within 1 week | 800 |
| Within 1 month | 500 |
| Within 3 months | 300 |
| Within 1 year | 100 |
| More than 1 year off | 0 |

## Tech stack

- **Expo (React Native)** - iOS and Android from a single codebase
- **Supabase** - authentication, Postgres database, and photo storage
- **React Navigation** - stack-based navigation

## Project structure

```
src/
  constants/      Scoring tiers and calculation logic
  lib/            Supabase client
  navigation/     Stack navigators and route type definitions
  screens/
    auth/         Login and sign-up
    friends/      Friend list, search, and request management
    game/         Home, upload, guess, and leaderboard screens
    profile/      First-time profile setup and profile editing
  types/          Shared TypeScript types
supabase/
  schema.sql      Full database schema with RLS policies
```

## Getting started

### 1. Supabase setup

- Create a project at [supabase.com](https://supabase.com).
- Run `supabase/schema.sql` in the Supabase SQL editor.
- Go to Storage and create a public bucket named `photos`.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your project details:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the app

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your device, or press `a` for Android emulator / `i` for iOS simulator.

## Database schema

| Table | Purpose |
|---|---|
| `users` | Extended user profiles (display name, avatar) |
| `friendships` | Friend requests and accepted connections |
| `photos` | Uploaded photos with the actual date (hidden from the guesser) |
| `rounds` | Each guess attempt, including the score once resolved |
| `leaderboard` | View aggregating total scores per user |

Row-level security is enabled on all tables. The actual date of a photo is stored server-side and is never exposed to the guesser before they submit.

## Current features

- Email and password authentication
- First-time profile setup with a searchable display name
- Friend system with search, requests, and removal
- Async photo challenges — upload a photo, pick a friend, they guess later
- EXIF date pre-fill when selecting a photo from the camera roll
- Tiered scoring with a result screen showing days off and points earned
- Leaderboard across all rounds
