// src/services/api.js
// Data access on Firestore: couples/{COUPLE_ID}/{collection}/{id}. Same shape the app used before.
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db, COUPLE_ID, LOGIN_EMAIL } from './firebase';
import { applyVote, voteKey } from '../match';

const colRef = (name) => collection(db, 'couples', COUPLE_ID, name);
const docRef = (name, id) => doc(db, 'couples', COUPLE_ID, name, id);
const withId = (snap) => ({ ...snap.data(), id: snap.id });

export const api = {
  newId: () => doc(colRef('toWatch')).id,

  // Calls back with true/false whenever the sign-in state changes. Returns unsubscribe.
  onSessionChange: (callback) => onAuthStateChanged(auth, (user) => callback(Boolean(user && user.email === LOGIN_EMAIL))),
  login: (password) => signInWithEmailAndPassword(auth, LOGIN_EMAIL, password),
  logout: () => signOut(auth),
  // Firebase ID token for the TMDB function; refreshed automatically by the SDK.
  getIdToken: () => auth.currentUser?.getIdToken() ?? Promise.reject(new Error('Not signed in')),

  getCollection: async (name) => (await getDocs(colRef(name))).docs.map(withId),
  // Merge semantics, like the old app's setDoc(..., { merge: true }). An `id` field is never stored.
  setDoc: (name, id, data) => {
    const { id: _ignored, ...fields } = data;
    return setDoc(docRef(name, id), fields, { merge: true });
  },
  deleteDoc: (name, id) => deleteDoc(docRef(name, id)),

  // Match mode: records my vote; if it completes a match, adds the title to To Watch in the same
  // transaction (fixed id, so two simultaneous Yes votes still create one entry). Resolves to true on a match.
  castVote(title, me, value) {
    const key = voteKey(title);
    const info = {
      title: title.title,
      type: title.type,
      mediaType: title.mediaType,
      tmdbId: title.tmdbId,
      posterPath: title.posterPath || null,
      overview: title.overview || '',
      year: title.year || null,
      rating: title.rating || null,
      releaseDate: title.releaseDate || null
    };
    return runTransaction(db, async (tx) => {
      const ref = docRef('votes', key);
      const snap = await tx.get(ref);
      const { update, match } = applyVote(snap.exists() ? snap.data() : null, me, value);
      tx.set(ref, { ...info, ...update }, { merge: true });
      if (match) {
        tx.set(docRef('toWatch', `match-${key}`), {
          ...info,
          service: 'Other',
          anthonyPriority: 2,
          pamPriority: 2,
          addedBy: 'match',
          addedDate: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
      return match;
    });
  },

  // Live list. onItems gets the full array on every change (Firestore handles reconnects and offline).
  watchCollection(name, { onItems, onError }) {
    return onSnapshot(colRef(name), (snap) => onItems(snap.docs.map(withId)), (err) => onError?.(err));
  },

  // Live single document; onDoc gets null when it doesn't exist.
  watchDoc(name, id, { onDoc, onError }) {
    return onSnapshot(docRef(name, id), (snap) => onDoc(snap.exists() ? withId(snap) : null), (err) => onError?.(err));
  }
};

export default api;
