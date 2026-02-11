/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "listadetareas-cb9a7.firebaseapp.com",
  projectId: "listadetareas-cb9a7",
  storageBucket: "listadetareas-cb9a7.firebasestorage.app",
  messagingSenderId: "246655635442",
  appId: "TU_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "FinanzasApp";
  const options = {
    body: payload.notification?.body || "",
    icon: "/logo192.png",
  };
  self.registration.showNotification(title, options);
});
