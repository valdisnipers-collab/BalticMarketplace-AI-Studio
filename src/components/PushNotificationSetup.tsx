import { useEffect } from 'react';
import { useAuth } from './AuthContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(subscription),
        });
      } catch {
        // Silent fail — push is not critical
      }
    };

    setup();
  }, [user?.id]);

  return null;
}
