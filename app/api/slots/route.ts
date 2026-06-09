import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, doc, query, orderBy, getDocs, writeBatch } from 'firebase/firestore'
import { generateTimeSlots } from '@/lib/time-slots'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      const mockSlots = generateTimeSlots().map(slot => ({
        ...slot,
        capacity: 8,
        bookedCount: Math.floor(Math.random() * 6),
        waitlistEnabled: false,
      }))
      return NextResponse.json(mockSlots)
    }

    const slotsRef = collection(db, 'slots')
    const q = query(slotsRef, orderBy('time'))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      const defaultSlots = generateTimeSlots()
      const batch = writeBatch(db)
      
      for (const slot of defaultSlots) {
        const docRef = doc(db, 'slots', slot.id)
        batch.set(docRef, {
          ...slot,
          capacity: 8,
          bookedCount: 0,
          waitlistEnabled: false,
        })
      }
      
      await batch.commit()
      
      return NextResponse.json(defaultSlots.map(slot => ({
        ...slot,
        capacity: 8,
        bookedCount: 0,
        waitlistEnabled: false,
      })))
    }
    
    const slots = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    
    return NextResponse.json(slots)
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch slots' },
      { status: 500 }
    )
  }
}
