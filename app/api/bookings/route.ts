import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { addTrackToPlaylist } from '@/lib/spotify'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      slotId,
      fullName,
      email,
      instagram,
      friendNames,
      groupSize,
      spotifyTrack,
    } = body

    // Validate required fields
    if (!slotId || !fullName || !email || groupSize < 1) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!db) {
      // Mock response if Firebase is not configured
      return NextResponse.json({
        success: true,
        bookingId: `mock-${Date.now()}`,
        message: 'Booking created (demo mode)',
      })
    }

    // Use a transaction to prevent race conditions
    const result = await db.runTransaction(async (transaction) => {
      const slotRef = db.collection('slots').doc(slotId)
      const slotDoc = await transaction.get(slotRef)

      if (!slotDoc.exists) {
        throw new Error('Slot not found')
      }

      const slotData = slotDoc.data()!
      const availableSpots = slotData.capacity - slotData.bookedCount

      if (availableSpots < groupSize) {
        throw new Error('Not enough spots available')
      }

      // Create booking
      const bookingRef = db.collection('bookings').doc()
      const bookingData = {
        slotId,
        fullName,
        email,
        instagram: instagram || null,
        friendNames: friendNames || [],
        groupSize,
        spotifyTrack: spotifyTrack || null,
        createdAt: FieldValue.serverTimestamp(),
      }

      transaction.set(bookingRef, bookingData)

      // Update slot booked count
      transaction.update(slotRef, {
        bookedCount: FieldValue.increment(groupSize),
      })

      return { bookingId: bookingRef.id }
    })

    // Add track to playlist if provided (outside transaction)
    if (spotifyTrack?.uri) {
      try {
        await addTrackToPlaylist(spotifyTrack.uri)
      } catch (error) {
        console.error('Failed to add track to playlist:', error)
        // Don't fail the booking if playlist addition fails
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      message: 'Booking confirmed!',
    })
  } catch (error) {
    console.error('Booking error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create booking'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json([])
    }

    const bookingsRef = db.collection('bookings')
    const snapshot = await bookingsRef.orderBy('createdAt', 'desc').get()

    const bookings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}
