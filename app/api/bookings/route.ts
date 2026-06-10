import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, serverTimestamp, increment, collection, doc, runTransaction, query, where, orderBy, limit, getDocs, getDoc, updateDoc } from 'firebase/firestore'
import { addTrackToPlaylist } from '@/lib/spotify'
import { isAdminAuthenticated } from '@/lib/admin'

const WAITLIST_GROUP_ID = process.env.MAILERLITE_WAITLIST_GROUP_ID
const CONFIRMED_GROUP_ID = process.env.MAILERLITE_CONFIRMED_GROUP_ID

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
    const nameParts = data.fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    const groupId = data.isWaitlist
      ? WAITLIST_GROUP_ID
        ? [WAITLIST_GROUP_ID]
        : []
      : CONFIRMED_GROUP_ID
        ? [CONFIRMED_GROUP_ID]
        : []

    const subscriberData = {
      email: data.email,
      fields: {
        name: firstName,
        last_name: lastName,
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
      }
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
    } else {
      console.log('Successfully added to Mailerlite:', data.email)
    }

    const subscriberId = (await response.json())?.data?.id

    const groupResponse = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    if (!groupResponse.ok) {
      const errorData = await groupResponse.json()
      console.error('Mailerlite error:', errorData)
    } else {
      console.log('Successfully added to Group:', groupId)
    }
  } catch (error) {
    console.error('Failed to add to Mailerlite:', error)
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

    if (!slotId || !fullName || !email || groupSize < 1) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (friendNames && friendNames.length > 0) {
      const emptyNames = friendNames.filter((name: string) => !name || !name.trim())
      if (emptyNames.length > 0) {
        return NextResponse.json(
          { error: 'Please provide names for all friends' },
          { status: 400 }
        )
      }
    }

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      const mockBookingId = `LR-${Date.now().toString(36).toUpperCase()}`
      return NextResponse.json({
        success: true,
        bookingId: mockBookingId,
        message: 'Booking created (demo mode)',
      })
    }

    const result = await runTransaction(db, async (transaction) => {
      const slotRef = doc(db, 'slots', slotId)
      const slotDoc = await transaction.get(slotRef)

      if (!slotDoc.exists()) {
        throw new Error('Slot not found')
      }

      const slotData = slotDoc.data()!

      const capacity = slotData.capacity || 0
      const bookedCount = slotData.bookedCount || 0

      const availableSpots = capacity - bookedCount
      const isWaitlist = availableSpots < groupSize

      const bookingId = `LR-${Date.now().toString(36).toUpperCase()}`
      const bookingRef = doc(collection(db, 'bookings'))

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
        createdAt: serverTimestamp(),
      }

      transaction.set(bookingRef, bookingData)

      if (!isWaitlist) {
        transaction.update(slotRef, {
          bookedCount: increment(groupSize),
        })
      }

      return {
        bookingId,
        firestoreId: bookingRef.id,
        isWaitlist,
      }
    })

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

    if (spotifyTrack?.uri) {
      try {
        await addTrackToPlaylist(spotifyTrack.uri, slotDisplayTime)
      } catch (error) {
        console.error('Failed to add track to playlist:', error)
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
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json([])
    }

    const bookingsRef = collection(db, 'bookings')
    const q = query(bookingsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

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

export async function PATCH(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie')
    const sessionCookie = cookieHeader ? cookieHeader.match(/admin_session=([^;]+)/)?.[1] : undefined
    if (!sessionCookie || !isAdminAuthenticated(sessionCookie)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, status, slotId, groupSize, fullName, email, spotifyTrack } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Booking id is required' },
        { status: 400 }
      )
    }

    const bookingsRef = collection(db, 'bookings')
    const q = query(bookingsRef, where('bookingId', '==', id), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const bookingDoc = querySnapshot.docs[0]
    const bookingData = bookingDoc.data()
    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    }

    if (status) updates.status = status
    if (fullName) updates.fullName = fullName
    if (email) updates.email = email
    if (typeof groupSize === 'number') updates.groupSize = groupSize
    if (typeof spotifyTrack !== 'undefined') updates.spotifyTrack = spotifyTrack

    if (slotId && slotId !== bookingData.slotId) {
      updates.slotId = slotId

      await runTransaction(db, async (transaction) => {
        const oldSlotRef = doc(db, 'slots', bookingData.slotId)
        const newSlotRef = doc(db, 'slots', slotId)
        const oldSlotDoc = await transaction.get(oldSlotRef)
        const newSlotDoc = await transaction.get(newSlotRef)

        if (oldSlotDoc.exists() && !bookingData.isWaitlist && bookingData.status !== 'waitlist') {
          transaction.update(oldSlotRef, {
            bookedCount: increment(-bookingData.groupSize),
          })
        }

        if (newSlotDoc.exists()) {
          const newSlotData = newSlotDoc.data()!
          const newAvailable = (newSlotData.capacity || 0) - (newSlotData.bookedCount || 0)
          const newIsWaitlist = newAvailable < (groupSize || bookingData.groupSize)

          updates.isWaitlist = newIsWaitlist
          updates.status = newIsWaitlist ? 'waitlist' : 'confirmed'

          if (!newIsWaitlist) {
            transaction.update(newSlotRef, {
              bookedCount: increment(groupSize || bookingData.groupSize),
            })
          }
        }
      })
    }

    await updateDoc(bookingDoc.ref, updates)

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}
