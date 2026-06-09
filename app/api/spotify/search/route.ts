import { NextResponse } from 'next/server'
import SpotifyWebApi from 'spotify-web-api-node'

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
})

let tokenExpiresAt = 0

async function getAccessToken() {
  if (Date.now() < tokenExpiresAt) {
    return spotifyApi.getAccessToken()
  }
  
  const data = await spotifyApi.clientCredentialsGrant()
  spotifyApi.setAccessToken(data.body.access_token)
  tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000
  
  return data.body.access_token
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json([])
  }
  
  try {
    await getAccessToken()
    
    const data = await spotifyApi.searchTracks(query, { limit: 10 })
    
    const tracks = data.body.tracks?.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      uri: track.uri,
      previewUrl: track.preview_url,
    })) || []
    
    return NextResponse.json(tracks)
  } catch (error) {
    console.error('Spotify search error:', error)
    return NextResponse.json({ error: 'Failed to search tracks' }, { status: 500 })
  }
}
