import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from '../firebase/config';
import { savePushToken } from '../firebase/config';

export const requestPushPermission = async (userId: string) => {
  const supported = await isSupported();
  if (!supported) return { success: false, error: 'Push no soportado en este navegador' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Permiso denegado' };
  }

  const messaging = getMessaging(app);
  const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { success: false, error: 'VAPID key no configurada' };

  const token = await getToken(messaging, { vapidKey });
  if (!token) return { success: false, error: 'No se pudo obtener token' };

  await savePushToken(userId, token);
  return { success: true };
};
