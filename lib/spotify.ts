// Spotify API utilities
export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  uri: string
  previewUrl?: string
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  if (!query.trim()) return []
  
  const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`)
  
  if (!response.ok) {
    throw new Error('Failed to search tracks')
  }
  
  return response.json()
}

export async function addTrackToPlaylist(trackUri: string): Promise<boolean> {
  const response = await fetch('/api/spotify/playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackUri }),
  })
  
  return response.ok
}
