import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA07GH6CjC958vQv_2ZyKW38owT08X5vyM",
  authDomain: "vn-sacmaudisan.firebaseapp.com",
  projectId: "vn-sacmaudisan",
  storageBucket: "vn-sacmaudisan.firebasestorage.app",
  messagingSenderId: "350622881135",
  appId: "1:350622881135:web:dd894580511dd4a2d2849a",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
