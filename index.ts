import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';

import App from './App';

if (Constants.appOwnership !== 'expo') {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async _remoteMessage => {});
}

registerRootComponent(App);
