/*
=====================================================
js/firebaseconfig.js
Configuração e Inicialização do Firebase SDK
=====================================================
*/

const firebaseConfig = {
  apiKey: "AIzaSyAqJlXqfuviG1aI34xwLkVPZgY_lIy98c4",
  authDomain: "barbearia-5a270.firebaseapp.com",
  projectId: "barbearia-5a270",
  storageBucket: "barbearia-5a270.firebasestorage.app",
  messagingSenderId: "866885264371",
  appId: "1:866885264371:web:9f7d87bad060dd19a66886",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Inicializa o Firestore
window.db = firebase.firestore();

// (Opcional, mas recomendado para evitar um warning no console)
window.db.settings({ experimentalForceLongPolling: true, merge: true });
