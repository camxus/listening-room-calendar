import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { slotId, fullName, email, groupSize } = body

    if (!slotId || !fullName || !email || !groupSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // create waitlist booking
    const bookingRef = doc(collection(db, 'bookings'))

    await setDoc(bookingRef, {
      slotId,
      fullName,
      email,
      groupSize,
      status: 'waitlist',
      isWaitlist: true,
      createdAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      waitlistId: bookingRef.id,
      message: 'Added to waitlist!',
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slotId = searchParams.get('slotId')

    const bookingsCol = collection(db, 'bookings')

    // IMPORTANT: build query safely (no reassignment bugs)
    const q = slotId
      ? query(
          bookingsCol,
          where('status', '==', 'waitlist'),
          where('slotId', '==', slotId),
          orderBy('createdAt', 'asc')
        )
      : query(
          bookingsCol,
          where('status', '==', 'waitlist'),
          orderBy('createdAt', 'asc')
        )

    const snapshot = await getDocs(q)

    const waitlist = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json(waitlist)
  } catch (error) {
    console.error('Error fetching waitlist:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}