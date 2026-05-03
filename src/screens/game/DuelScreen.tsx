import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  StatusBar, ScrollView, FlatList, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import EncryptedImage from '../../components/EncryptedImage';
import type { AppStackParamList } from '../../navigation/types';
import { C, R } from '../../theme';

type DuelRoute = RouteProp<AppStackParamList, 'Duel'>;
type Nav = NativeStackNavigationProp<AppStackParamList>;

type FullDuel = {
  id: string;
  status: string;
  challenger_id: string;
  opponent_id: string;
  challenger_photo_id: string | null;
  opponent_photo_id: string | null;
  challenger_score: number | null;
  opponent_score: number | null;
  winner_id: string | null;
  created_at: string;
  challenger: { display_name: string };
  opponent: { display_name: string };
  challenger_photo: { id: string; storage_url: string; challenge_type: string; caption: string | null } | null;
  opponent_photo:   { id: string; storage_url: string; challenge_type: string; caption: string | null } | null;
};

type MyPost = { id: string; created_at: string; caption: string | null; challenge_type: string };

function scoreColor(score: number) {
  if (score >= 800) return C.accent;
  if (score >= 400) return C.success;
  return C.error;
}

export default function DuelScreen() {
  const route = useRoute<DuelRoute>();
  const navigation = useNavigation<Nav>();
  const { duelId } = route.params;

  const [duel, setDuel] = useState<FullDuel | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Round statuses
  const [challengerRound, setChallengerRound] = useState<{ id: string; score: number | null; resolved_at: string | null } | null>(null);
  const [opponentRound, setOpponentRound] = useState<{ id: string; score: number | null; resolved_at: string | null } | null>(null);

  useFocusEffect(useCallback(() => { loadDuel(); }, []));

  async function loadDuel() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from('duels')
      .select(`
        *,
        challenger:users!challenger_id(display_name),
        opponent:users!opponent_id(display_name),
        challenger_photo:photos!challenger_photo_id(id, storage_url, challenge_type, caption),
        opponent_photo:photos!opponent_photo_id(id, storage_url, challenge_type, caption)
      `)
      .eq('id', duelId)
      .single();

    if (!data) { setLoading(false); return; }
    const d = data as FullDuel;
    setDuel(d);

    // Fetch relevant rounds if both photos exist
    if (d.challenger_photo_id && d.opponent_photo_id) {
      const [cRound, oRound] = await Promise.all([
        supabase.from('rounds').select('id, score, resolved_at')
          .eq('photo_id', d.opponent_photo_id)    // challenger guesses opponent's photo
          .eq('guesser_id', d.challenger_id)
          .maybeSingle(),
        supabase.from('rounds').select('id, score, resolved_at')
          .eq('photo_id', d.challenger_photo_id)  // opponent guesses challenger's photo
          .eq('guesser_id', d.opponent_id)
          .maybeSingle(),
      ]);
      setChallengerRound(cRound.data ?? null);
      setOpponentRound(oRound.data ?? null);

      // Auto-complete if both resolved and status still 'active'
      if (d.status === 'active' && cRound.data?.resolved_at && oRound.data?.resolved_at) {
        const cScore = cRound.data.score ?? 0;
        const oScore = oRound.data.score ?? 0;
        await supabase.from('duels').update({
          challenger_score: cScore,
          opponent_score: oScore,
          winner_id: cScore >= oScore ? d.challenger_id : d.opponent_id,
          status: 'complete',
        }).eq('id', duelId);
        loadDuel();
        return;
      }
    }

    setLoading(false);
  }

  async function openPhotoPicker() {
    setPickerLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('photos')
      .select('id, created_at, caption, challenge_type')
      .eq('sender_id', user.id)
      .eq('is_post', true)
      .order('created_at', { ascending: false })
      .limit(20);
    setMyPosts((data ?? []) as MyPost[]);
    setPickerLoading(false);
    setShowPicker(true);
  }

  async function pickPhoto(photoId: string) {
    if (!duel) return;
    setShowPicker(false);
    const isChallenger = duel.challenger_id === userId;

    if (isChallenger) {
      await supabase.from('duels').update({ challenger_photo_id: photoId }).eq('id', duelId);
    } else {
      await supabase.from('duels').update({
        opponent_photo_id: photoId,
        status: 'active',
      }).eq('id', duelId);
    }
    loadDuel();
  }

  async function acceptAndPickPhoto() {
    openPhotoPicker();
  }

  async function rejectDuel() {
    Alert.alert('Decline duel?', 'The duel will be cancelled.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive',
        onPress: async () => {
          await supabase.from('duels').update({ status: 'rejected' }).eq('id', duelId);
          navigation.goBack();
        },
      },
    ]);
  }

  async function guessPhoto(photoId: string) {
    const { data: existing } = await supabase
      .from('rounds')
      .select('id')
      .eq('photo_id', photoId)
      .eq('guesser_id', userId)
      .maybeSingle();

    let roundId = existing?.id;
    if (!roundId) {
      const { data: newRound } = await supabase
        .from('rounds')
        .insert({ photo_id: photoId, guesser_id: userId })
        .select('id')
        .single();
      roundId = newRound?.id;
    }
    if (roundId) navigation.navigate('Guess', { roundId });
  }

  if (loading || !duel) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isChallenger = duel.challenger_id === userId;
  const myName = isChallenger ? duel.challenger.display_name : duel.opponent.display_name;
  const theirName = isChallenger ? duel.opponent.display_name : duel.challenger.display_name;
  const myPhotoId = isChallenger ? duel.challenger_photo_id : duel.opponent_photo_id;
  const theirPhotoId = isChallenger ? duel.opponent_photo_id : duel.challenger_photo_id;
  const theirPhoto = isChallenger ? duel.opponent_photo : duel.challenger_photo;
  const myRound = isChallenger ? challengerRound : opponentRound;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>⚔️  Duel</Text>
          <View style={styles.vsRow}>
            <Text style={styles.vsName}>{duel.challenger.display_name}</Text>
            <Text style={styles.vsLabel}>vs</Text>
            <Text style={styles.vsName}>{duel.opponent.display_name}</Text>
          </View>
        </View>

        {/* Complete */}
        {duel.status === 'complete' && (
          <View style={styles.completeCard}>
            {duel.winner_id === userId ? (
              <Text style={styles.completeWin}>🏆 You won!</Text>
            ) : (
              <Text style={styles.completeLoss}>You lost this round</Text>
            )}
            <View style={styles.scoreRow}>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreBlockName}>{duel.challenger.display_name}</Text>
                <Text style={[styles.scoreBlockPts, { color: scoreColor(duel.challenger_score ?? 0) }]}>
                  {duel.challenger_score ?? '—'}
                </Text>
              </View>
              <Text style={styles.scoreDash}>–</Text>
              <View style={styles.scoreBlock}>
                <Text style={styles.scoreBlockName}>{duel.opponent.display_name}</Text>
                <Text style={[styles.scoreBlockPts, { color: scoreColor(duel.opponent_score ?? 0) }]}>
                  {duel.opponent_score ?? '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Rejected */}
        {duel.status === 'rejected' && (
          <View style={styles.rejectedCard}>
            <Text style={styles.rejectedText}>This duel was declined</Text>
          </View>
        )}

        {/* Pending: challenger needs to pick their photo */}
        {duel.status === 'pending' && isChallenger && !myPhotoId && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Pick your challenge photo</Text>
            <Text style={styles.actionSub}>Choose one of your posts for {theirName} to guess</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={openPhotoPicker} activeOpacity={0.85}>
              {pickerLoading ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryBtnText}>Choose a post →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Pending: challenger waiting after picking photo */}
        {duel.status === 'pending' && isChallenger && myPhotoId && (
          <View style={styles.waitCard}>
            <Text style={styles.waitText}>⏳ Waiting for {theirName} to accept</Text>
          </View>
        )}

        {/* Pending: opponent needs to accept */}
        {duel.status === 'pending' && !isChallenger && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{theirName} challenged you!</Text>
            <Text style={styles.actionSub}>Accept to pick your photo and start the duel</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={acceptAndPickPhoto} activeOpacity={0.85}>
              {pickerLoading ? <ActivityIndicator color={C.white} /> : <Text style={styles.primaryBtnText}>Accept + pick photo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={rejectDuel} activeOpacity={0.8}>
              <Text style={styles.secondaryBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active: show their photo to guess */}
        {duel.status === 'active' && theirPhoto && theirPhotoId && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>THEIR CHALLENGE</Text>
            <View style={styles.photoCard}>
              <EncryptedImage uri={theirPhoto.storage_url} style={styles.photo} resizeMode="cover" />
              {theirPhoto.caption ? <Text style={styles.photoCaption}>{theirPhoto.caption}</Text> : null}
            </View>
            {myRound?.resolved_at ? (
              <View style={[styles.resolvedPill, { borderColor: scoreColor(myRound.score ?? 0) + '50' }]}>
                <Text style={[styles.resolvedText, { color: scoreColor(myRound.score ?? 0) }]}>
                  Your score: {myRound.score} pts
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => guessPhoto(theirPhotoId)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Guess their photo →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Active: waiting for opponent to guess your photo */}
        {duel.status === 'active' && (
          <View style={styles.waitCard}>
            <Text style={styles.waitText}>
              {(isChallenger ? opponentRound : challengerRound)?.resolved_at
                ? `✓ ${theirName} has guessed your photo`
                : `⏳ Waiting for ${theirName} to guess your photo`}
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Photo picker modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a post</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={myPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.postRow}
                onPress={() => pickPhoto(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.postRowInfo}>
                  <Text style={styles.postRowType}>
                    {item.challenge_type === 'date' ? '📅 Date challenge'
                      : item.challenge_type === 'location' ? '📍 Location challenge'
                      : '🖼️ No challenge'}
                  </Text>
                  <Text style={styles.postRowCaption} numberOfLines={1}>
                    {item.caption ?? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.postRowArrow}>→</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: C.text3, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
                No posts yet. Post something first!
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { fontSize: 22, color: C.text2 },

  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 16 },

  titleRow: { gap: 6 },
  title: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vsName: { fontSize: 14, fontWeight: '600', color: C.text2 },
  vsLabel: { fontSize: 12, color: C.text3 },

  completeCard: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 24,
    alignItems: 'center', gap: 12, borderWidth: 0.5, borderColor: C.border,
  },
  completeWin: { fontSize: 24, fontWeight: '800', color: C.accent },
  completeLoss: { fontSize: 18, fontWeight: '700', color: C.text2 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreBlock: { alignItems: 'center', gap: 4 },
  scoreBlockName: { fontSize: 12, color: C.text3, fontWeight: '600' },
  scoreBlockPts: { fontSize: 36, fontWeight: '900' },
  scoreDash: { fontSize: 20, color: C.text3, fontWeight: '300' },

  rejectedCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 20,
    alignItems: 'center', borderWidth: 0.5, borderColor: C.border,
  },
  rejectedText: { fontSize: 15, color: C.text3 },

  actionCard: {
    backgroundColor: C.surface, borderRadius: R.xl, padding: 22,
    gap: 10, borderWidth: 0.5, borderColor: C.border,
  },
  actionTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  actionSub: { fontSize: 13, color: C.text3, lineHeight: 18 },

  waitCard: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: 16,
    borderWidth: 0.5, borderColor: C.border,
  },
  waitText: { fontSize: 14, color: C.text2, textAlign: 'center' },

  section: { gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1.5 },
  photoCard: {
    backgroundColor: C.surface, borderRadius: R.lg, overflow: 'hidden',
    borderWidth: 0.5, borderColor: C.border,
  },
  photo: { width: '100%', aspectRatio: 1 },
  photoCaption: { fontSize: 13, color: C.text2, padding: 12, fontStyle: 'italic' },

  resolvedPill: {
    alignSelf: 'flex-start', borderWidth: 0.5, borderRadius: R.full,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  resolvedText: { fontSize: 13, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: C.primary, borderRadius: R.md, paddingVertical: 15,
    alignItems: 'center', shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  primaryBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1, borderColor: C.error, borderRadius: R.md,
    paddingVertical: 13, alignItems: 'center',
  },
  secondaryBtnText: { color: C.error, fontWeight: '700', fontSize: 14 },

  modal: { flex: 1, backgroundColor: C.bg },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  modalClose: { fontSize: 15, color: C.primary, fontWeight: '700' },

  postRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: C.surface, borderRadius: R.md, gap: 12,
    borderWidth: 0.5, borderColor: C.border,
  },
  postRowInfo: { flex: 1, gap: 3 },
  postRowType: { fontSize: 13, fontWeight: '600', color: C.text },
  postRowCaption: { fontSize: 12, color: C.text3 },
  postRowArrow: { fontSize: 18, color: C.primary },
});
