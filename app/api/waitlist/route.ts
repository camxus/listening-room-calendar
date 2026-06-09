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

    if (!db) {
      return NextResponse.json({
        success: true,
        waitlistId: `mock-waitlist-${Date.now()}`,
        message: 'Added to waitlist (demo mode)',
      })
    }

    const waitlistRef = db.collection('waitlist').doc()
    await waitlistRef.set({
      slotId,
      fullName,
      email,
      groupSize,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      waitlistId: waitlistRef.id,
      message: 'Added to waitlist!',
    })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const slotId = searchParams.get('slotId')

    let query = db.collection('waitlist').orderBy('createdAt', 'asc')
    
    if (slotId) {
      query = query.where('slotId', '==', slotId) as typeof query
    }

    const snapshot = await query.get()

    const waitlist = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))

    return NextResponse.json(waitlist)
  } catch (error) {
    console.error('Error fetching waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waitlist' },
      { status: 500 }
    )
  }
}
