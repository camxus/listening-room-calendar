'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Loader2, Music, Clock, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlaylistTrack {
  id: string
  name: string
  artist: string
  album: string
  albumArt: string
  uri: string
  source?: 'booking' | 'search' | 'admin'
  bookingName?: string
}

interface PlaylistData {
  id: string
  slotId: string
  slotDisplayTime: string
  name: string
  tracks: PlaylistTrack[]
}

export default function JoinPlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    params.then(p => setPlaylistId(p.id))
  }, [params])

  useEffect(() => {
    if (!playlistId) return

    async function fetchPlaylist() {
      try {
        const response = await fetch(`/api/playlists/${playlistId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Playlist not found')
          } else {
            throw new Error('Failed to fetch playlist')
          }
          return
        }
        const data = await response.json()
        setPlaylist(data.playlist)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load playlist')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlaylist()
  }, [playlistId])

  const copyUrl = () => {
    if (!playlistId) return
    const url = `${window.location.origin}/join/${playlistId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fadeBlurIn = {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading playlist...</p>
        </motion.div>
      </div>
    )
  }

  if (error && !playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          {...fadeBlurIn}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <Music className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Playlist Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        {...fadeBlurIn}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 px-4 py-6 bg-background/95 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-lg font-bold text-foreground">Listening Room Playlist</h1>
          <p className="text-sm text-muted-foreground mt-1">{playlist?.name}</p>
        </div>
      </motion.header>

      <main className="px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Slot</p>
                <p className="font-semibold text-foreground">{playlist?.slotDisplayTime}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-spotify/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-spotify" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Songs</p>
                <p className="font-semibold text-foreground">{playlist?.tracks?.length || 0}</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={copyUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Share Playlist'}
            </motion.button>
          </motion.div>

          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Playlist Queue</h3>
              <p className="text-sm text-muted-foreground">Songs in order of play</p>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {playlist?.tracks?.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-secondary/20"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {track.albumArt ? (
                      <Image
                        src={track.albumArt}
                        alt={track.album}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Music className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{track.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    {track.bookingName && (
                      <p className="text-xs text-muted-foreground truncate">Added by {track.bookingName}</p>
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}