import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import FeedScreen from './game/FeedScreen';
import ChallengesScreen from './game/ChallengesScreen';
import FriendsScreen from './friends/FriendsScreen';
import ProfileScreen from './profile/ProfileScreen';
import TabBar from '../components/TabBar';
import { C } from '../theme';

export default function MainTabsScreen() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [challengeCount, setChallengeCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchChallengeCount();
    }, [])
  );

  async function fetchChallengeCount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from('rounds')
      .select('id', { count: 'exact', head: true })
      .eq('guesser_id', user.id)
      .is('resolved_at', null);
    setChallengeCount(count ?? 0);
  }

  function goToPage(page: number) {
    pagerRef.current?.setPage(page);
    setCurrentPage(page);
  }

  return (
    <View style={styles.root}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        <View key="feed" style={styles.page}><FeedScreen /></View>
        <View key="challenges" style={styles.page}><ChallengesScreen /></View>
        <View key="friends" style={styles.page}><FriendsScreen /></View>
        <View key="profile" style={styles.page}><ProfileScreen /></View>
      </PagerView>
      <TabBar
        currentPage={currentPage}
        onTabPress={goToPage}
        challengeCount={challengeCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
