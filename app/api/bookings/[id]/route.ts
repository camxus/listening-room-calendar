import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, serverTimestamp, increment, collection, doc, runTransaction, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore'

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

export async function sendPromotionEmail(data: {
  email: string
  fullName: string
  bookingId: string
  slotDisplayTime: string
}) {
  const apiKey = process.env.MAILERLITE_API_KEY
  const CONFIRMED_GROUP_ID = process.env.MAILERLITE_CONFIRMED_GROUP_ID

  if (!apiKey || !CONFIRMED_GROUP_ID) {
    console.log('MailerLite not configured')
    return
  }

  try {
    const getRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(
        data.email
      )}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    )

    if (!getRes.ok) {
      console.log('Subscriber not found, skipping promotion')
      return
    }

    const subscriber = await getRes.json()
    const subscriberId = subscriber.data.id

    const updateRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            slot_time: data.slotDisplayTime,
            booking_id: data.bookingId,
            status: 'confirmed',
          },
        }),
      }
    )

    if (!updateRes.ok) {
      const err = await updateRes.json()
      console.error('Failed to update subscriber fields:', err)
    }

    const groupRes = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${CONFIRMED_GROUP_ID}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    )

    if (!groupRes.ok) {
      const err = await groupRes.json()
      console.error('Failed to promote subscriber:', err)
      return
    }

    console.log(
      `Promoted + email triggered for ${data.email} at ${data.slotDisplayTime}`
    )
  } catch (error) {
    console.error('sendPromotionEmail error:', error)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({
        id: 'mock-doc-id',
        bookingId: id,
        slotId: 'slot-1',
        slotDisplayTime: '10:00 AM',
        fullName: 'Demo User',
        email: 'demo@example.com',
        instagram: '@demo',
        friendNames: [],
        groupSize: 1,
        spotifyTrack: null,
        createdAt: new Date().toISOString(),
        status: 'confirmed',
      })
    }

    const bookingsRef = collection(db, 'bookings')
    const q = query(bookingsRef, where('bookingId', '==', id), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      const docRef = doc(db, 'bookings', id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }

      const data = docSnap.data()!
      return NextResponse.json({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
      })
    }

    const docSnap = querySnapshot.docs[0]
    const data = docSnap.data()

    return NextResponse.json({
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({
        success: true,
        message: 'Booking cancelled (demo mode)',
      })
    }

    const bookingsRef = collection(db, 'bookings')

    let bookingDoc: any = null
    let bookingData: any = null
    let docId = ''

    const q = query(bookingsRef, where('bookingId', '==', id), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      bookingDoc = querySnapshot.docs[0]
      bookingData = bookingDoc.data()
      docId = bookingDoc.id
    } else {
      const docRef = doc(db, 'bookings', id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        bookingDoc = docSnap
        bookingData = docSnap.data()
        docId = docSnap.id
      }
    }

    if (!bookingDoc || !bookingData) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (bookingData.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    const wasWaitlisted =
      bookingData.status === 'waitlist' ||
      bookingData.isWaitlist === true

    await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, 'bookings', docId)

      transaction.update(bookingRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      })

      if (!wasWaitlisted) {
        const slotRef = doc(db, 'slots', bookingData.slotId)

        transaction.update(slotRef, {
          bookedCount: increment(
            -bookingData.groupSize
          ),
        })
      }
    })

    let promotedBookingId: string | null = null

    if (!wasWaitlisted) {
      const slotRef = doc(db, 'slots', bookingData.slotId)
      const slotDoc = await getDoc(slotRef)

      if (slotDoc.exists()) {
        const slotData = slotDoc.data()!

        const availableSpots =
          (slotData.capacity || 0) -
          (slotData.bookedCount || 0)

        const waitlistQ = query(
          collection(db, 'bookings'),
          where('slotId', '==', bookingData.slotId),
          where('status', '==', 'waitlist'),
          orderBy('createdAt', 'asc')
        )
        const waitlistSnapshot = await getDocs(waitlistQ)

        const candidateDoc = waitlistSnapshot.docs.find((d) => {
          const data = d.data()
          return data.groupSize <= availableSpots
        })

        if (candidateDoc) {
          const candidateData = candidateDoc.data()
          const candidateRef = candidateDoc.ref

          await runTransaction(db, async (transaction) => {
            transaction.update(candidateRef, {
              status: 'confirmed',
              isWaitlist: false,
              promotedAt: serverTimestamp(),
            })

            transaction.update(slotRef, {
              bookedCount: increment(
                candidateData.groupSize
              ),
            })
          })

          promotedBookingId = candidateData.bookingId

          const apiKey = process.env.MAILERLITE_API_KEY
          const CONFIRMED_GROUP_ID =
            process.env.MAILERLITE_CONFIRMED_GROUP_ID
          const WAITLIST_GROUP_ID =
            process.env.MAILERLITE_WAITLIST_GROUP_ID

          const getRes = await fetch(
            `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(
              candidateData.email
            )}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
              },
            }
          )

          if (getRes.ok) {
            const subscriber = await getRes.json()
            const subscriberId = subscriber.data.id

            await fetch(
              `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${CONFIRMED_GROUP_ID}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Accept: 'application/json',
                },
              }
            )

            await fetch(
              `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${WAITLIST_GROUP_ID}`,
              {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  Accept: 'application/json',
                },
              }
            )
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      promotedBookingId,
      message: promotedBookingId
        ? 'Booking cancelled and waitlist guest promoted'
        : 'Booking cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel booking',
      },
      {
        status: 500,
      }
    )
  }
}

