import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCK6JfwPMAcjyMUQAEz2ZQujheoKv23eEo",
  authDomain: "ajstory-21d9e.firebaseapp.com",
  projectId: "ajstory-21d9e",
  storageBucket: "ajstory-21d9e.firebasestorage.app",
  messagingSenderId: "654883758333",
  appId: "1:654883758333:web:773d73740ad29c3d26de94",
  measurementId: "G-N6W24G9X6C"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
