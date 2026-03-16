
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyC2g5BuAY6-S-TVpa9hujjxUaGk4DMkWOc",
  authDomain: "bentabarkada-40597313-e88ce.firebaseapp.com",
  projectId: "bentabarkada-40597313-e88ce",
  storageBucket: "bentabarkada-40597313-e88ce.appspot.com",
  messagingSenderId: "196417743944",
  appId: "1:196417743944:web:e94799f2dbc7d8c7b73c7d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
