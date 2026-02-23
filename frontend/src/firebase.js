// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARboRZZoNx0U-d53RESfYx-jW1TyGLae8",
  authDomain: "ecommerce-e55c0.firebaseapp.com",
  projectId: "ecommerce-e55c0",
  storageBucket: "ecommerce-e55c0.firebasestorage.app",
  messagingSenderId: "754588939447",
  appId: "1:754588939447:web:e6ded4540d23e7ceb20932",
  measurementId: "G-JH5VDGLG67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);