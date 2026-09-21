/**
 * Browser notification helpers. Permission is requested exactly once, on the
 * caller's first Start click — never on page load, per the PRD. `notify`
 * only ever fires while the tab is hidden, and never throws.
 */

/**
 * Requests Notification permission if it hasn't been decided yet. Resolves
 * `true` only when permission is (or becomes) granted. Safe to call
 * repeatedly — it will not re-prompt once the user has answered.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Fires a notification. No-op unless the document is hidden and permission
 * was already granted — never prompts, never throws.
 */
export function notify(title: string, body: string): void {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body });
  } catch {
    // Some environments (older mobile Safari, restrictive contexts) throw on
    // direct construction. Silently skip rather than crash the timer.
  }
}
