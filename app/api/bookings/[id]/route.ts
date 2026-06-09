import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

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
    // 1. Get subscriber
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

    // 2. Update subscriber fields (optional but useful for automation emails)
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

    // 3. Move to CONFIRMED group (triggers automation email)
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

// Remove subscriber from Mailerlite
async function removeFromMailerlite(email: string) {
  const apiKey = process.env.MAILERLITE_API_KEY
  if (!apiKey) {
    console.log('Mailerlite API key not configured, skipping...')
    return
  }

  try {
    // First get the subscriber ID
    const getResponse = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    if (!getResponse.ok) {
      console.log('Subscriber not found in Mailerlite, skipping removal')
      return
    }

    const subscriber = await getResponse.json()

    // Delete the subscriber
    const deleteResponse = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${subscriber.data.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log('Successfully removed from Mailerlite:', email)
    } else {
      console.error('Failed to remove from Mailerlite:', deleteResponse.status)
    }
  } catch (error) {
    console.error('Error removing from Mailerlite:', error)
  }
}

// GET - Fetch booking by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!db) {
      // Mock response for demo mode
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

    // First try to find by bookingId field
    const bookingsRef = db.collection('bookings')
    const querySnapshot = await bookingsRef.where('bookingId', '==', id).limit(1).get()

    if (querySnapshot.empty) {
      // Fall back to document ID
      const docRef = bookingsRef.doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        )
      }

      const data = doc.data()!
      return NextResponse.json({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        cancelledAt: data.cancelledAt?.toDate?.()?.toISOString() || null,
      })
    }

    const doc = querySnapshot.docs[0]
    const data = doc.data()

    return NextResponse.json({
      id: doc.id,
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

// DELETE - Cancel/unsubscribe from booking
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!db) {
      return NextResponse.json({
        success: true,
        message: 'Booking cancelled (demo mode)',
      })
    }

    const bookingsRef = db.collection('bookings')

    let bookingDoc = null
    let bookingData: any = null
    let docId = ''

    // First try bookingId
    const querySnapshot = await bookingsRef
      .where('bookingId', '==', id)
      .limit(1)
      .get()

    if (!querySnapshot.empty) {
      bookingDoc = querySnapshot.docs[0]
      bookingData = bookingDoc.data()
      docId = bookingDoc.id
    } else {
      // Fallback to Firestore document ID
      const docRef = bookingsRef.doc(id)
      const doc = await docRef.get()

      if (doc.exists) {
        bookingDoc = doc
        bookingData = doc.data()
        docId = doc.id
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

    //
    // Cancel booking
    //
    await db.runTransaction(async (transaction) => {
      const bookingRef = bookingsRef.doc(docId)

      transaction.update(bookingRef, {
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
      })

      // Only restore capacity if this booking was occupying capacity
      if (!wasWaitlisted) {
        const slotRef = db.collection('slots').doc(bookingData.slotId)

        transaction.update(slotRef, {
          bookedCount: FieldValue.increment(
            -bookingData.groupSize
          ),
        })
      }
    })

    //
    // If a confirmed booking was cancelled,
    // try to promote someone from waitlist
    //
    let promotedBookingId: string | null = null

    if (!wasWaitlisted) {
      const slotRef = db.collection('slots').doc(bookingData.slotId)
      const slotDoc = await slotRef.get()

      if (slotDoc.exists) {
        const slotData = slotDoc.data()!

        const availableSpots =
          (slotData.capacity || 0) -
          (slotData.bookedCount || 0)

        const waitlistSnapshot = await bookingsRef
          .where('slotId', '==', bookingData.slotId)
          .where('status', '==', 'waitlist')
          .orderBy('createdAt', 'asc')
          .get()

        const candidate = waitlistSnapshot.docs.find((doc) => {
          const data = doc.data()

          return (
            data.groupSize <= availableSpots
          )
        })

        if (candidate) {
          const candidateData = candidate.data()

          await db.runTransaction(async (transaction) => {
            transaction.update(candidate.ref, {
              status: 'confirmed',
              isWaitlist: false,
              promotedAt: FieldValue.serverTimestamp(),
            })

            transaction.update(slotRef, {
              bookedCount: FieldValue.increment(
                candidateData.groupSize
              ),
            })
          })

          promotedBookingId = candidateData.bookingId

          // 👉 GET MAILERLITE SUBSCRIBER FIRST
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

            // ✅ MOVE TO CONFIRMED GROUP
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

            // 🧹 REMOVE FROM WAITLIST GROUP
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

          // // optional email (you can keep or remove if MailerLite automation handles it)
          // await sendPromotionEmail({
          //   email: candidateData.email,
          //   fullName: candidateData.fullName,
          //   slotDisplayTime: candidateData.slotDisplayTime,
          //   bookingId: candidateData.bookingId,
          // })
        }
      }
    }

    // Optional:
    // await removeFromMailerlite(bookingData.email)

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