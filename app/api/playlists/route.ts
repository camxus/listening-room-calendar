import { NextResponse } from 'next/server'
import SpotifyWebApi from 'spotify-web-api-node'
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { isAdminAuthenticated } from '@/lib/admin'
import type { PlaylistTrack } from '@/lib/firebase'
import { undefinedToNull } from '@/lib/utils'
import { getAccessToken } from '../spotify/search/route'

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
})

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

interface PlaylistTrackInput extends PlaylistTrack {
  source?: 'booking' | 'search' | 'admin'
  bookingId?: string
  bookingName?: string
}

interface PlaylistPayload {
  playlistId?: string | null
  slotId: string
  slotDisplayTime: string
  name: string
  tracks: PlaylistTrackInput[]
}

interface SpotifyPlaylistResult {
  playlistId: string | null
  skipped: boolean
  reason?: string
}

function getSessionFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(/admin_session=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function hasSpotifyCredentials(): boolean {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REFRESH_TOKEN
  )
}

async function refreshSpotifyAccessToken() {
  try {
    const data = await spotifyApi.refreshAccessToken()
    spotifyApi.setAccessToken(data.body.access_token)
    return data.body.access_token
  } catch (error) {
    console.error('Error refreshing Spotify access token:', error)
    throw error
  }
}

async function getSpotifyUserId(): Promise<string> {
  await refreshSpotifyAccessToken()
  const data = await spotifyApi.getMe()
  return data.body.id
}

async function getAllPlaylistTrackItems(playlistId: string) {
  const allItems: any[] = []
  let offset = 0
  const pageLimit = 100

  while (true) {
    const page = await spotifyApi.getPlaylistTracks(playlistId, {
      limit: pageLimit,
      offset,
      fields: 'items.track.uri,total',
    })

    const items = page.body.items.filter((item: any) => item.track?.uri)
    allItems.push(...items)

    const total = page.body.total || 0
    if (allItems.length >= total || items.length < pageLimit) break

    offset += pageLimit
  }

  return allItems
}

async function syncSpotifyPlaylist(input: {
  playlistId?: string | null
  name: string
  slotDisplayTime: string
  tracks: PlaylistTrack[]
}): Promise<SpotifyPlaylistResult> {
  if (!hasSpotifyCredentials()) {
    return { playlistId: input.playlistId || null, skipped: true, reason: 'Spotify credentials are not configured' }
  }

  try {
    console.log("getting")
    const userId = await getSpotifyUserId()
    let playlistId = input.playlistId

    if (!playlistId && spotifyApi) {
      const created = await spotifyApi.createPlaylist(input.name, {
        description: `Listening room playlist for the ${input.slotDisplayTime} slot`,
        public: false,
      })

      playlistId = created.body.id
      console.log("recieved")
    }

    if (!playlistId) {
      throw new Error('Spotify playlist was not created')
    }

    if (playlistId) {
      await spotifyApi.changePlaylistDetails(playlistId, {
        name: input.name,
        description: `Listening room playlist for the ${input.slotDisplayTime} slot`,
        public: false,
      })
    }

    const existingItems = await getAllPlaylistTrackItems(playlistId)
    if (existingItems.length > 0) {
      await spotifyApi.removeTracksFromPlaylist(
        playlistId,
        existingItems.map((item) => ({ uri: item.track.uri }))
      )
    }

    const spotifyTrackUris = input.tracks.map((track) => track.uri).filter(Boolean)
    if (spotifyTrackUris.length > 0) {
      const chunkSize = 100
      for (let index = 0; index < spotifyTrackUris.length; index += chunkSize) {
        await spotifyApi.addTracksToPlaylist(playlistId, spotifyTrackUris.slice(index, index + chunkSize), {
          position: index,
        })
      }
    }

    return { playlistId, skipped: false }
  } catch (error) {
    console.error('Spotify playlist sync error:', error)
    return {
      playlistId: input.playlistId || null,
      skipped: true,
      reason: error instanceof Error ? error.message : 'Failed to sync Spotify playlist',
    }
  }
}

function normalizePlaylistTracks(tracks: PlaylistTrackInput[]): PlaylistTrack[] {
  const seen = new Set<string>()

  return tracks.flatMap((track) => {
    const key = track.uri || track.id
    if (!key || seen.has(key)) return []
    seen.add(key)

    const source = track.source === 'search' || track.source === 'booking' || track.source === 'admin'
      ? track.source
      : 'admin'

    return [
      {
        id: track.id || key,
        name: track.name,
        artist: track.artist,
        album: track.album,
        albumArt: track.albumArt || '',
        uri: track.uri || '',
        previewUrl: track.previewUrl,
        source,
        bookingId: track.bookingId,
        bookingName: track.bookingName,
      },
    ]
  })
}

function serializeTimestamp(value: any): string | null {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate().toISOString()
  if (typeof value === 'string') return value
  return null
}

async function getExistingPlaylistBySlot(slotId: string): Promise<Record<string, any> | null> {
  const q = query(
    collection(db, 'playlists'),
    where('slotId', '==', slotId),
    orderBy('updatedAt', 'desc'),
    limit(1)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const playlistDoc = snapshot.docs[0]
  return {
    id: playlistDoc.id,
    ...playlistDoc.data(),
  }
}

async function savePlaylistToFirestore(
  payload: PlaylistPayload,
  existingDocId?: string,
  spotifyPlaylistId?: string | null
) {
  const normalizedTracks = normalizePlaylistTracks(payload.tracks)
  const data = undefinedToNull({
    playlistId: spotifyPlaylistId || payload.playlistId || null,
    slotId: payload.slotId,
    slotDisplayTime: payload.slotDisplayTime,
    name: payload.name,
    tracks: normalizedTracks,
  })

  if (existingDocId) {
    await updateDoc(doc(db, 'playlists', existingDocId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return existingDocId
  }

  const playlistRef = doc(collection(db, 'playlists'))
  console.log(data)
  await setDoc(playlistRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return playlistRef.id
}

async function requireAdmin(request: Request) {
  const sessionCookie = getSessionFromRequest(request)
  if (!sessionCookie || !isAdminAuthenticated(sessionCookie)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({ playlists: [] })
    }

    const { searchParams } = new URL(request.url)
    const slotId = searchParams.get('slotId')

    const playlistsRef = collection(db, 'playlists')
    const q = slotId
      ? query(
        playlistsRef,
        where('slotId', '==', slotId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      )
      : query(playlistsRef, orderBy('createdAt', 'desc'), limit(50))

    const snapshot = await getDocs(q)
    const playlists = snapshot.docs.map((playlistDoc) => ({
      id: playlistDoc.id,
      ...playlistDoc.data(),
      createdAt: serializeTimestamp(playlistDoc.data().createdAt),
      updatedAt: serializeTimestamp(playlistDoc.data().updatedAt),
    }))

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    const body = (await request.json()) as PlaylistPayload
    const { playlistId, slotId, slotDisplayTime, name, tracks } = body

    if (!slotId || !slotDisplayTime) {
      return NextResponse.json(
        { error: 'slotId and slotDisplayTime are required' },
        { status: 400 }
      )
    }

    const playlistName = name.trim() || `COMBO X IMMERSIA: Slot ${slotDisplayTime}`
    const normalizedTracks = normalizePlaylistTracks(tracks)

    let existingDocId: string | undefined
    let existingSpotifyPlaylistId: string | null | undefined = playlistId || null

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      const spotifyResult = await syncSpotifyPlaylist({
        playlistId: existingSpotifyPlaylistId,
        name: playlistName,
        slotDisplayTime,
        tracks: normalizedTracks,
      })

      return NextResponse.json({
        success: true,
        playlist: {
          id: 'local',
          playlistId: spotifyResult.playlistId,
          slotId,
          slotDisplayTime,
          name: playlistName,
          tracks: normalizedTracks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        spotifyPlaylistId: spotifyResult.playlistId,
        spotifySkipped: spotifyResult.skipped,
        spotifySkipReason: spotifyResult.reason,
      })
    }

    if (playlistId) {
      const existingDoc = await getDoc(doc(db, 'playlists', playlistId))
      if (existingDoc.exists()) {
        existingDocId = playlistId
        existingSpotifyPlaylistId = existingDoc.data().playlistId || playlistId
      }
    }

    if (!existingDocId) {
      const existingBySlot = await getExistingPlaylistBySlot(slotId)
      if (existingBySlot) {
        existingDocId = existingBySlot.id
        existingSpotifyPlaylistId = existingBySlot.playlistId || playlistId || null
      }
    }

    const firestoreId = await savePlaylistToFirestore(
      {
        playlistId: existingSpotifyPlaylistId,
        slotId,
        slotDisplayTime,
        name: playlistName,
        tracks: normalizedTracks,
      },
      existingDocId,
      existingSpotifyPlaylistId
    )

    const spotifyResult = await syncSpotifyPlaylist({
      playlistId: existingSpotifyPlaylistId,
      name: playlistName,
      slotDisplayTime,
      tracks: normalizedTracks,
    })

    if (spotifyResult.playlistId && spotifyResult.playlistId !== existingSpotifyPlaylistId) {
      await updateDoc(doc(db, 'playlists', firestoreId), {
        playlistId: spotifyResult.playlistId,
        updatedAt: serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: firestoreId,
        playlistId: spotifyResult.playlistId,
        slotId,
        slotDisplayTime,
        name: playlistName,
        tracks: normalizedTracks,
      },
      spotifyPlaylistId: spotifyResult.playlistId,
      spotifySkipped: spotifyResult.skipped,
      spotifySkipReason: spotifyResult.reason,
    })
  } catch (error) {
    console.error('Error saving playlist:', error)
    return NextResponse.json(
      { error: 'Failed to save playlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAdmin(request)
  if (unauthorized) return unauthorized

  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      return NextResponse.json({ success: true })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Playlist id is required' }, { status: 400 })
    }

    await deleteDoc(doc(db, 'playlists', id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting playlist:', error)
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    )
  }
}
