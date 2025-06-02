export const RIDER_SESSION_KEY = 'rider_session_uuid';

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function storeRiderSession(uuid: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(RIDER_SESSION_KEY, uuid);
  }
}

export function getRiderSession(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(RIDER_SESSION_KEY);
  }
  return null;
}

export function clearRiderSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(RIDER_SESSION_KEY);
  }
}

export function isLoggedIn(): boolean {
  return !!getRiderSession();
}
