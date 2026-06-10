import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { Booking, TimeSlot } from '@/lib/firebase'

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

function getCurrentSlot(slots: TimeSlot[]): TimeSlot | null {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const slot of slots) {
    const [hours, minutes] = slot.time.split(':').map(Number)
    const slotMinutes = hours * 60 + minutes
    const slotEndMinutes = slotMinutes + 30

    if (currentMinutes >= slotMinutes && currentMinutes < slotEndMinutes) {
      return slot
    }
  }

  return null
}

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({ playing: null, message: 'No active session' })
    }

    const slotsRef = collection(db, 'slots')
    const slotsSnapshot = await getDocs(query(slotsRef, orderBy('time')))
    const slots = slotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeSlot))

    const currentSlot = getCurrentSlot(slots)
    if (!currentSlot) {
      return NextResponse.json({ playing: null, message: 'No active session' })
    }

    const bookingsRef = collection(db, 'bookings')
    const q = query(
      bookingsRef,
      where('slotId', '==', currentSlot.id),
      where('spotifyTrack', '!=', null),
      orderBy('createdAt', 'desc'),
      limit(1)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return NextResponse.json({ playing: null, message: 'No song currently playing', slot: currentSlot })
    }

    const booking = snapshot.docs[0].data() as Booking
    const track = booking.spotifyTrack

    return NextResponse.json({
      playing: {
        track: {
          name: track?.name || 'Unknown',
          artist: track?.artist || 'Unknown',
          albumArt: track?.albumArt || null,
        },
        addedBy: booking.fullName,
        slot: currentSlot.displayTime,
      },
    })
  } catch (error) {
    console.error('Error fetching currently playing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch currently playing song' },
      { status: 500 }
    )
  }
}
