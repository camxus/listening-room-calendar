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

export async function POST(request: Request) {
  try {
    const { trackUri } = await request.json()
    const playlistId = process.env.SPOTIFY_PLAYLIST_ID
    
    if (!trackUri || !playlistId) {
      return NextResponse.json(
        { error: 'Missing track URI or playlist ID' },
        { status: 400 }
      )
    }
    
    await refreshAccessToken()
    
    await spotifyApi.addTracksToPlaylist(playlistId, [trackUri])
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Spotify playlist error:', error)
    return NextResponse.json(
      { error: 'Failed to add track to playlist' },
      { status: 500 }
    )
  }
}
