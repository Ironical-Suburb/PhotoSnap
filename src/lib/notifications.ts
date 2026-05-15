import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const isExpoGo = Constants.appOwnership === 'expo';
const messaging = isExpoGo ? null : require('@react-native-firebase/messaging').default;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (!messaging) return;

  const authStatus = await messaging().requestPermission();
  const granted =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!granted) return;

  try {
    const token = await messaging().getToken();
    await savePushToken(token);

    messaging().onTokenRefresh(savePushToken);
  } catch (e) {
    console.warn('FCM token registration failed:', e);
  }
}

async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('users').update({ push_token: token }).eq('id', user.id);
  }
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await fetch('https://exp.host/--/expo-push-notification-service/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify({ to: pushToken, title, body, sound: 'default', data }),
  });
}
