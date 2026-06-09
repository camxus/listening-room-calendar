import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { generateTimeSlots } from '@/lib/time-slots'

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    })
  }
}

const db = getApps().length > 0 ? getFirestore() : null

export async function GET() {
  try {
    if (!db) {
      // Return mock data if Firebase is not configured
      const mockSlots = generateTimeSlots().map(slot => ({
        ...slot,
        capacity: 8,
        bookedCount: Math.floor(Math.random() * 6),
        waitlistEnabled: false,
      }))
      return NextResponse.json(mockSlots)
    }

    const slotsRef = db.collection('slots')
    const snapshot = await slotsRef.orderBy('time').get()
    
    if (snapshot.empty) {
      // Initialize slots if they don't exist
      const defaultSlots = generateTimeSlots()
      const batch = db.batch()
      
      for (const slot of defaultSlots) {
        const docRef = slotsRef.doc(slot.id)
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
