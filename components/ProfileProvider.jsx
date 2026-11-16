'use client';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import Stores from '../lib/profile-store.cjs';
const Context = createContext(null);
export function ProfileProvider({ children }) {
  const [store] = useState(() => Stores.createProfileStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => { store.hydrate(); const refresh = e => store.storageChanged(e); const restore = e => { if (e.persisted) store.hydrate(); }; window.addEventListener('storage',refresh); window.addEventListener('pageshow',restore); return () => { window.removeEventListener('storage',refresh); window.removeEventListener('pageshow',restore); }; },[store]);
  return <Context.Provider value={{ ...snapshot, store }}>{children}</Context.Provider>;
}
export function useProfile() { const value = useContext(Context); if (!value) throw new Error('Profile provider missing'); return value; }
