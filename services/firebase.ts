import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAx3oD6VJ8U6BQThOSMig6VlYfWKIJJzag",
  authDomain: "firstproject-ee02c.firebaseapp.com",
  projectId: "firstproject-ee02c",
  storageBucket: "firstproject-ee02c.firebasestorage.app",
  messagingSenderId: "73616558456",
  appId: "1:73616558456:web:27ca1fdd2aee89aaf0208d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);