import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { C } from '../theme';

type TabName = 'Home' | 'Challenges' | 'Upload' | 'Friends' | 'Profile';

const TABS: { name: TabName; label: string }[] = [
  { name: 'Home', label: 'Home' },
  { name: 'Challenges', label: 'Inbox' },
  { name: 'Upload', label: 'Snap' },
  { name: 'Friends', label: 'Friends' },
  { name: 'Profile', label: 'Me' },
];

export default function TabBar({ challengeCount = 0 }: { challengeCount?: number }) {
  const navigation = useNavigation();
  const route = useRoute();
  const current = route.name as TabName;

  const goTo = (name: TabName) => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name }] })
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const active = current === tab.name;
          const isSnap = tab.name === 'Upload';

          if (isSnap) {
            return (
              <TouchableOpacity key={tab.name} style={styles.snapWrap} onPress={() => goTo(tab.name)} activeOpacity={0.85}>
                <View style={[styles.snapBtn, active && styles.snapBtnActive]}>
                  <View style={styles.snapInner} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={tab.name} style={styles.tab} onPress={() => goTo(tab.name)} activeOpacity={0.7}>
              <View style={styles.tabIconWrap}>
                <TabIcon name={tab.name} active={active} />
                {tab.name === 'Challenges' && challengeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{challengeCount > 9 ? '9+' : challengeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ name, active }: { name: TabName; active: boolean }) {
  const color = active ? C.primary : C.text3;
  const size = 22;

  const icons: Record<TabName, string> = {
    Home: active ? '■' : '□',
    Challenges: active ? '▼' : '▽',
    Upload: '◎',
    Friends: active ? '●●' : '○○',
    Profile: active ? '●' : '○',
  };

  return (
    <Text style={{ color, fontSize: size, lineHeight: size + 2 }}>
      {icons[name]}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 56,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    gap: 3,
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: C.text3,
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: C.primary,
    fontWeight: '700',
  },
  snapWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  snapBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  snapBtnActive: {
    backgroundColor: '#FF7A45',
  },
  snapInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: C.white,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: C.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: C.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
