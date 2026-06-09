import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { addTrackToPlaylist } from '@/lib/spotify'

const WAITLIST_GROUP_ID = process.env.MAILERLITE_WAITLIST_GROUP_ID
const CONFIRMED_GROUP_ID = process.env.MAILERLITE_CONFIRMED_GROUP_ID

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

// Add subscriber to Mailerlite
async function addToMailerlite(data: {
  email: string
  fullName: string
  instagram?: string
  slotTime: string
  groupSize: number
  friendNames: string[]
  spotifyTrack?: { name: string; artist: string } | null
  bookingId: string
  isWaitlist: boolean
}) {
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!apiKey) {
    console.log('Mailerlite API key not configured, skipping...')
    return
  }

  try {
    // Split name into first and last
    const nameParts = data.fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const subscriberData = {
      email: data.email,
      fields: {
        name: firstName,
        last_name: lastName,
        // Custom fields - these need to be created in Mailerlite first
        instagram: data.instagram || '',
        slot_time: data.slotTime,
        group_size: String(data.groupSize),
        friend_names: data.friendNames.join(', '),
        song_submitted: data.spotifyTrack
          ? `${data.spotifyTrack.name} by ${data.spotifyTrack.artist}`
          : '',
        booking_date: new Date().toISOString().split('T')[0],
        booking_id: data.bookingId,
        source: 'listening_room_booking',
      },
      groups: data.isWaitlist
        ? WAITLIST_GROUP_ID
          ? [WAITLIST_GROUP_ID]
          : []
        : CONFIRMED_GROUP_ID
          ? [CONFIRMED_GROUP_ID]
          : [],
    }

    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(subscriberData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Mailerlite error:', errorData)
      // Don't throw - we don't want to fail the booking if Mailerlite fails
    } else {
      console.log('Successfully added to Mailerlite:', data.email)
    }
  } catch (error) {
    console.error('Failed to add to Mailerlite:', error)
    // Don't throw - we don't want to fail the booking if Mailerlite fails
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      slotId,
      slotDisplayTime,
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

    // Validate friend names if there are friends
    if (friendNames && friendNames.length > 0) {
      const emptyNames = friendNames.filter((name: string) => !name || !name.trim())
      if (emptyNames.length > 0) {
        return NextResponse.json(
          { error: 'Please provide names for all friends' },
          { status: 400 }
        )
      }
    }

    if (!db) {
      // Mock response if Firebase is not configured
      const mockBookingId = `LR-${Date.now().toString(36).toUpperCase()}`

      // Still try to add to Mailerlite
      // await addToMailerlite({
      //   email,
      //   fullName,
      //   instagram,
      //   slotTime: slotDisplayTime || 'Unknown',
      //   groupSize,
      //   friendNames: friendNames || [],
      //   spotifyTrack: spotifyTrack ? { name: spotifyTrack.name, artist: spotifyTrack.artist } : null,
      //   bookingId: mockBookingId,
      //   isWaitlist: false,
      // })

      return NextResponse.json({
        success: true,
        bookingId: mockBookingId,
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

      const capacity = slotData.capacity || 0
      const bookedCount = slotData.bookedCount || 0

      const availableSpots = capacity - bookedCount

      const isWaitlist = availableSpots < groupSize

      // Generate a human-readable booking ID
      const bookingId = `LR-${Date.now().toString(36).toUpperCase()}`

      const bookingRef = db.collection('bookings').doc()

      const bookingData = {
        bookingId,

        slotId,
        slotDisplayTime: slotDisplayTime || null,

        fullName,
        email,
        instagram: instagram || null,

        friendNames: friendNames || [],
        groupSize,

        spotifyTrack: spotifyTrack || null,

        status: isWaitlist ? 'waitlist' : 'confirmed',
        isWaitlist,

        createdAt: FieldValue.serverTimestamp(),
      }

      transaction.set(bookingRef, bookingData)

      // Only consume capacity if booking is confirmed
      if (!isWaitlist) {
        transaction.update(slotRef, {
          bookedCount: FieldValue.increment(groupSize),
        })
      }

      return {
        bookingId,
        firestoreId: bookingRef.id,
        isWaitlist,
      }
    })

    // Add to Mailerlite (outside transaction, don't fail if this fails)
    await addToMailerlite({
      email,
      fullName,
      instagram,
      slotTime: slotDisplayTime || 'Unknown',
      groupSize,
      friendNames: friendNames || [],
      spotifyTrack: spotifyTrack ? { name: spotifyTrack.name, artist: spotifyTrack.artist } : null,
      bookingId: result.bookingId,
      isWaitlist: result.isWaitlist,
    })

    // Add track to playlist if provided (outside transaction)
    if (spotifyTrack?.uri) {
      try {
        await addTrackToPlaylist(spotifyTrack.uri, slotDisplayTime)
      } catch (error) {
        console.error('Failed to add track to playlist:', error)
        // Don't fail the booking if playlist addition fails
      }
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      isWaitlist: result.isWaitlist,
      message: result.isWaitlist
        ? 'Added to waitlist successfully'
        : 'Booking confirmed!',
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
