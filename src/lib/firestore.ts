import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  type DocumentData,
  type QueryConstraint,
  type WithFieldValue,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── User profiles ────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  email: string | null
  displayName: string | null
  studentCode: string
  photoURL: string | null
  createdAt: ReturnType<typeof serverTimestamp>
  updatedAt: ReturnType<typeof serverTimestamp>
}

/** Create or overwrite a user profile document */
export async function createUserProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Fetch a user profile by uid */
export async function getUserProfile(uid: string) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserProfile) : null
}

/** Update specific fields on a user profile */
export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, 'users', uid)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

// ─── Generic CRUD helpers ─────────────────────────────────────────────────────

/** Get a single document by path */
export async function getDocument<T = DocumentData>(path: string, id: string) {
  const ref = doc(db, path, id)
  const snap = await getDoc(ref)
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
}

/** Add a document to a collection (auto-generated ID) */
export async function addDocument<T extends WithFieldValue<DocumentData>>(
  path: string,
  data: T,
) {
  const ref = collection(db, path)
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

/** Set a document with a specific ID */
export async function setDocument<T extends WithFieldValue<DocumentData>>(
  path: string,
  id: string,
  data: T,
) {
  const ref = doc(db, path, id)
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Update specific fields on a document */
export async function updateDocument<T extends DocumentData>(
  path: string,
  id: string,
  data: Partial<T>,
) {
  const ref = doc(db, path, id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

/** Delete a document */
export async function deleteDocument(path: string, id: string) {
  const ref = doc(db, path, id)
  await deleteDoc(ref)
}

/** Query a collection with optional constraints */
export async function queryCollection<T = DocumentData>(
  path: string,
  constraints: QueryConstraint[] = [],
) {
  const ref = collection(db, path)
  const q = query(ref, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T))
}

/** Real-time listener on a collection query. Returns an unsubscribe function. */
export function subscribeToCollection<T = DocumentData>(
  path: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void,
) {
  const ref = collection(db, path)
  const q = query(ref, ...constraints)
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T))
    callback(data)
  })
}

/** Real-time listener on a single document. Returns an unsubscribe function. */
export function subscribeToDocument<T = DocumentData>(
  path: string,
  id: string,
  callback: (data: T | null) => void,
) {
  const ref = doc(db, path, id)
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null)
  })
}

// Re-export query helpers so consumers don't need to import from firebase/firestore
export { where, orderBy, limit, serverTimestamp }
