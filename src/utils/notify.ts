/**
 * Browser notifications. Permission is requested on first start, never on page
 * load, and a notification only fires when the tab is actually in the
 * background — telling someone something finished while they watch it finish
 * is just noise.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function notify(title: string, body: string): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    new Notification(title, { body });
  } catch {
    // Some platforms throw for non-persistent notifications; never fatal.
  }
}
