import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, doc, query, orderBy, getDocs, writeBatch, serverTimestamp, increment, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { generateTimeSlots } from '@/lib/time-slots'
import { isAdminAuthenticated } from '@/lib/admin'

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

const SESSION_COOKIE_NAME = 'admin_session'

import { cookies } from 'next/headers'

function getSessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(/admin_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

export async function POST(request: Request) {
  try {
    const sessionCookie = getSessionFromRequest(request)
    if (!sessionCookie || !isAdminAuthenticated(sessionCookie)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { time, displayTime, capacity = 8, waitlistEnabled = false } = body

    if (!time || !displayTime) {
      return NextResponse.json(
        { error: 'time and displayTime are required' },
        { status: 400 }
      )
    }

    const id = `slot-${time.replace(':', '')}`
    const slotData = {
      time,
      displayTime,
      capacity,
      bookedCount: 0,
      waitlistEnabled,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const slotRef = doc(db, 'slots', id)
    await setDoc(slotRef, slotData)

    return NextResponse.json({ id, ...slotData }, { status: 201 })
  } catch (error) {
    console.error('Error creating slot:', error)
    return NextResponse.json(
      { error: 'Failed to create slot' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionCookie = getSessionFromRequest(request)
    if (!sessionCookie || !isAdminAuthenticated(sessionCookie)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, capacity, bookedCount, waitlistEnabled, displayTime } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Slot id is required' },
        { status: 400 }
      )
    }

    const slotRef = doc(db, 'slots', id)
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (typeof capacity === 'number') updates.capacity = capacity
    if (typeof bookedCount === 'number') updates.bookedCount = bookedCount
    if (typeof waitlistEnabled === 'boolean') updates.waitlistEnabled = waitlistEnabled
    if (displayTime) updates.displayTime = displayTime

    await updateDoc(slotRef, updates)

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error updating slot:', error)
    return NextResponse.json(
      { error: 'Failed to update slot' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionCookie = getSessionFromRequest(request)
    if (!sessionCookie || !isAdminAuthenticated(sessionCookie)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Slot id is required' },
        { status: 400 }
      )
    }

    const slotRef = doc(db, 'slots', id)
    await deleteDoc(slotRef)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting slot:', error)
    return NextResponse.json(
      { error: 'Failed to delete slot' },
      { status: 500 }
    )
  }
}
