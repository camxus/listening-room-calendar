import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp
let db: Firestore

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  db = getFirestore(app)
}

export { app, db }

// Types for Firestore collections
export interface TimeSlot {
  id: string
  time: string
  displayTime: string
  capacity: number
  bookedCount: number
  waitlistEnabled: boolean
}

export interface Booking {
  id: string
  slotId: string
  fullName: string
  email: string
  instagram?: string
  friendNames: string[]
  groupSize: number
  spotifyTrack: SpotifyTrack | null
  createdAt: Date
}

export interface WaitlistEntry {
  id: string
  slotId: string
  fullName: string
  email: string
  groupSize: number
  createdAt: Date
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  uri: string
  previewUrl?: string
}
