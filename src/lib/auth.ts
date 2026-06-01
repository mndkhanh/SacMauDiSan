import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import { createUserProfile } from './firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derives the hidden Firebase email from a student code */
export function studentCodeToEmail(studentCode: string) {
  return `${studentCode.trim().toLowerCase()}@gmail.com`
}

// ─── Student code auth ────────────────────────────────────────────────────────

/**
 * Register a new student.
 * Email   → {studentCode}@gmail.com  (hidden from user)
 * Password → studentCode              (auto-set)
 */
export async function registerWithStudentCode(studentCode: string, name: string) {
  const email = studentCodeToEmail(studentCode)
  const password = studentCode.trim()

  const credential = await createUserWithEmailAndPassword(auth, email, password)

  // Set display name on the Firebase Auth profile
  await updateProfile(credential.user, { displayName: name.trim() })

  // Persist extra info to Firestore
  await createUserProfile(credential.user.uid, {
    uid: credential.user.uid,
    email,
    displayName: name.trim(),
    studentCode: studentCode.trim().toUpperCase(),
    photoURL: null,
  })

  return credential.user
}

/**
 * Sign in an existing student with their student code.
 * Email   → {studentCode}@gmail.com  (derived automatically)
 * Password → studentCode              (auto-set at registration)
 */
export async function loginWithStudentCode(studentCode: string) {
  const email = studentCodeToEmail(studentCode)
  const password = studentCode.trim()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

/**
 * Reset password for a student code.
 * Sends a reset link to {studentCode}@gmail.com.
 * Only works if the student registered with a real Gmail address that matches
 * their student code — otherwise an admin reset via Firebase Console is needed.
 */
export async function resetStudentPassword(studentCode: string) {
  const email = studentCodeToEmail(studentCode)
  await sendPasswordResetEmail(auth, email)
}

// ─── Generic helpers (kept for admin / future use) ────────────────────────────

/** Sign out the current user */
export async function logout() {
  await signOut(auth)
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}
