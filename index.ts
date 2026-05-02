import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';

// Must be registered before the app mounts so Firebase can handle
// notifications when the app is backgrounded or killed.
messaging().setBackgroundMessageHandler(async _remoteMessage => {});

registerRootComponent(App);
