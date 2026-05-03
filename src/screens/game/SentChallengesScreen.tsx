import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import EncryptedImage from '../../components/EncryptedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { C, R } from '../../theme';

type SentPhoto = {
  id: string;
  storage_url: string;
  actual_date: string;
  caption: string | null;
  created_at: string;
  receiver_id: string;
  receiver: { display_name: string } | null;
  round: { guess_date: string | null; score: number | null } | null;
};

export default function SentChallengesScreen() {
  const [photos, setPhotos] = useState<SentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomedUri, setZoomedUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchSent();
    }, [])
  );

  async function fetchSent() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: photoRows } = await supabase
      .from('photos')
      .select('id, storage_url, actual_date, caption, created_at, receiver_id')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (!photoRows?.length) { setPhotos([]); setLoading(false); return; }

    const photoIds = photoRows.map((p) => p.id);
    const receiverIds = [...new Set(photoRows.map((p) => p.receiver_id))];

    const [{ data: rounds }, { data: receivers }] = await Promise.all([
      supabase.from('rounds').select('photo_id, guess_date, score').in('photo_id', photoIds),
      supabase.from('users').select('id, display_name').in('id', receiverIds),
    ]);

    const roundMap = new Map((rounds ?? []).map((r) => [r.photo_id, r]));
    const receiverMap = new Map((receivers ?? []).map((u) => [u.id, u]));

    setPhotos(
      photoRows.map((p) => ({
        ...p,
        receiver: receiverMap.get(p.receiver_id) ?? null,
        round: roundMap.get(p.id) ?? null,
      }))
    );
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Sent</Text>
        <Text style={styles.subtitle}>{photos.length} challenge{photos.length !== 1 ? 's' : ''} sent</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item, index) => item.id ?? String(index)}
          contentContainerStyle={photos.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const guessed = item.round?.guess_date != null;
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.thumbWrap} onPress={() => setZoomedUri(item.storage_url)} activeOpacity={0.85}>
                  <EncryptedImage uri={item.storage_url} style={styles.thumb} />
                </TouchableOpacity>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTo}>
                      To {item.receiver?.display_name ?? 'friend'}
                    </Text>
                    <View style={[styles.statusPill, guessed && styles.statusPillDone]}>
                      <Text style={[styles.statusPillText, guessed && styles.statusPillTextDone]}>
                        {guessed ? 'Guessed' : 'Waiting'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardDate}>
                    Taken {new Date(item.actual_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  {guessed ? (
                    <View style={styles.cardResult}>
                      <Text style={styles.cardScore}>{item.round!.score}</Text>
                      <Text style={styles.cardScoreLabel}>pts</Text>
                    </View>
                  ) : (
                    <Text style={styles.cardPending}>Awaiting guess…</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing sent yet</Text>
              <Text style={styles.emptySub}>Upload a photo to challenge a friend.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!zoomedUri} animationType="fade" statusBarTranslucent>
        <View style={styles.zoomModal}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomedUri(null)}>
            <Text style={styles.zoomCloseText}>✕</Text>
          </TouchableOpacity>
          {zoomedUri && (
            <EncryptedImage uri={zoomedUri} style={styles.zoomImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.text2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  thumbWrap: {
    borderRadius: R.sm,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: C.white,
  },
  thumb: {
    width: 72,
    height: 72,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTo: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  statusPill: {
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: C.surface2,
  },
  statusPillDone: {
    backgroundColor: 'rgba(50,215,75,0.15)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.text3,
  },
  statusPillTextDone: {
    color: C.success,
  },
  cardDate: {
    fontSize: 12,
    color: C.text2,
    marginTop: 4,
  },
  cardResult: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 4,
  },
  cardScore: {
    fontSize: 22,
    fontWeight: '900',
    color: C.primary,
  },
  cardScoreLabel: {
    fontSize: 12,
    color: C.text3,
    fontWeight: '600',
  },
  cardPending: {
    fontSize: 12,
    color: C.text3,
    fontStyle: 'italic',
    marginTop: 4,
  },
  zoomModal: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  zoomClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text2,
  },
  emptySub: {
    fontSize: 14,
    color: C.text3,
    textAlign: 'center',
  },
});
