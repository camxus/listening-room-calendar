import { initializeApp } from "firebase/app";
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp
} from "firebase/firestore";
import * as dotenv from "dotenv";
dotenv.config();
// ---------------------------
// Firebase Config
// ---------------------------
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------------------
// SLOT DATA
// ---------------------------
const slots = [
    { time: "18:00", displayTime: "6:00 PM" },
    { time: "19:00", displayTime: "7:00 PM" },
    { time: "20:00", displayTime: "8:00 PM" },
    { time: "21:00", displayTime: "9:00 PM" },
];

// ---------------------------
// BOOKINGS DATA (sample)
// ---------------------------
const bookings = [
    {
        fullName: "John Doe",
        email: "john@test.com",
        slotId: "slot-1800",
        slotDisplayTime: "6:00 PM",
        groupSize: 2,
        status: "confirmed",
        isWaitlist: false,
        instagram: "@john",
    },
    {
        fullName: "Jane Smith",
        email: "jane@test.com",
        slotId: "slot-1800",
        slotDisplayTime: "6:00 PM",
        groupSize: 4,
        status: "waitlist",
        isWaitlist: true,
        instagram: "@jane",
    },
];

// ---------------------------
// SEED FUNCTION
// ---------------------------
async function seed() {
    console.log("🔥 Seeding Firestore...");

    // ---------------------------
    // Create Slots
    // ---------------------------
    for (const slot of slots) {
        const slotId = `slot-${slot.time.replace(":", "")}`;

        await setDoc(doc(db, "slots", slotId), {
            time: slot.time,
            displayTime: slot.displayTime,
            capacity: 8,
            bookedCount: 0,
            waitlistEnabled: false,
            createdAt: serverTimestamp(),
        });

        console.log(`✅ Slot created: ${slotId}`);
    }

    // ---------------------------
    // Create Bookings
    // ---------------------------
    for (const booking of bookings) {
        const bookingRef = await addDoc(collection(db, "bookings"), {
            ...booking,
            bookingId: `LR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            friendNames: [],
            spotifyTrack: null,
            createdAt: serverTimestamp(),
        });

        console.log(`✅ Booking created: ${bookingRef.id}`);
    }

    console.log("🎉 Seeding complete!");
}

seed().catch((err) => {
    console.error("❌ Seeding failed:", err);
});