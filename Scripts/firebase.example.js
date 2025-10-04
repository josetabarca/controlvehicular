// Import the functions you need from the SDKs you need
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
        import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
        import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
        // TODO: Add SDKs for Firebase products that you want to use
        // https://firebase.google.com/docs/web/setup#available-libraries

        // Your web app's Firebase configuration
        // For Firebase JS SDK v7.20.0 and later, measurementId is optional
        const firebaseConfig = {
            apiKey: "",
            authDomain: "",
            projectId: "sistema-vehicular",
            storageBucket: "",
            messagingSenderId: "",
            appId: "",
            measurementId: ""
        };

        // Initialize Firebase
        export const app = initializeApp(firebaseConfig);
        export const auth = getAuth(app);
        export const db = getFirestore(app)