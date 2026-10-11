import { initializeApp } from "firebase/app";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc, deleteField, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const configured = Boolean(config.apiKey && config.projectId);

function makeDb() {
  const app = initializeApp(config);
  try {
    // Local cache = instant loads and works offline.
    // Long-polling auto-detect = fixes the "stuck connecting" problem on some networks/proxies.
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}
const db = configured ? makeDb() : null;

export function useCollection(name) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(!configured);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, name),
      (snap) => { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setReady(true); },
      (e) => { setError(e.message); setReady(true); }
    );
  }, [name]);
  return { items, ready, error };
}

export function useDocData(col, id) {
  const [data, setData] = useState({});
  const [ready, setReady] = useState(!configured);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      doc(db, col, id),
      (s) => { setData(s.exists() ? s.data() : {}); setReady(true); },
      (e) => { setError(e.message); setReady(true); }
    );
  }, [col, id]);
  return { data, ready, error };
}

export const addItem = (name, data) => addDoc(collection(db, name), { ...data, createdAt: serverTimestamp() });
export const updateItem = (name, id, data) => updateDoc(doc(db, name, id), data);
export const removeItem = (name, id) => deleteDoc(doc(db, name, id));
// map: { "0-3": true, "0-4": deleteField() }
export const setChecked = (map) => setDoc(doc(db, "tracker", "roadmap"), { checked: map }, { merge: true });
export { deleteField };
