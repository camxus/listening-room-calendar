import { NextResponse } from 'next/server'
import SpotifyWebApi from 'spotify-web-api-node'

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
})

async function refreshAccessToken() {
  try {
    const data = await spotifyApi.refreshAccessToken()
    spotifyApi.setAccessToken(data.body.access_token)
    return data.body.access_token
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw error
  }
}

async function findOrCreatePlaylist(slotDisplayTime: string): Promise<string> {
  await refreshAccessToken()

  const userId = await spotifyApi.getMe()
  const userIdStr = userId.body.id

  const playlistName = `COMBO X IMMERSIA: Slot ${slotDisplayTime}`

  const existingPlaylists = await spotifyApi.getUserPlaylists(userIdStr, { limit: 50 })
  const existing = existingPlaylists.body.items.find((p) => p.name === playlistName)

  if (existing) {
    return existing.id
  }

  const created = await spotifyApi.createPlaylist(playlistName, {
    description: `Listening room playlist for the ${slotDisplayTime} slot`,
    public: false,
  })

  return created.body.id
}

export async function POST(request: Request) {
  try {
    const { trackUri, slotDisplayTime } = await request.json()

    if (!trackUri || !slotDisplayTime) {
      return NextResponse.json(
        { error: 'Missing track URI or slot display time' },
        { status: 400 }
      )
    }

    const playlistId = await findOrCreatePlaylist(slotDisplayTime)

    await spotifyApi.addTracksToPlaylist(playlistId, [trackUri])

    return NextResponse.json({ success: true, playlistId })
  } catch (error) {
    console.error('Spotify playlist error:', error)
    return NextResponse.json(
      { error: 'Failed to add track to playlist' },
      { status: 500 }
    )
  }
}
