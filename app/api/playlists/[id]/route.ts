import { NextResponse } from 'next/server'
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  doc,
  getDoc,
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

function serializeTimestamp(value: any): string | null {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

export async function GET(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({ playlist: null, error: 'Database not configured' })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 })
    }

    const playlistDoc = await getDoc(doc(db, 'playlists', id))

    if (!playlistDoc.exists()) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    const data = playlistDoc.data()
    const playlist = {
      id: playlistDoc.id,
      ...data,
      createdAt: serializeTimestamp(data?.createdAt),
      updatedAt: serializeTimestamp(data?.updatedAt),
    }

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Error fetching playlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlist' },
      { status: 500 }
    )
  }
}