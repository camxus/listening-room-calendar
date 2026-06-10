'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Music2, Users, Clock, Loader2 } from 'lucide-react'

interface CurrentlyPlaying {
  playing: {
    track: {
      name: string
      artist: string
      albumArt: string | null
    }
    addedBy: string
    slot: string
  } | null
  message?: string
  slot?: {
    displayTime: string
  }
}

export default function CurrentlyPlayingPage() {
  const [data, setData] = useState<CurrentlyPlaying | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchCurrentlyPlaying() {
      try {
        const response = await fetch('/api/currently-playing')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching currently playing:', error)
        setData({ playing: null, message: 'Failed to load' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentlyPlaying()
    const interval = setInterval(fetchCurrentlyPlaying, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 px-4 py-6 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-foreground">Currently Playing</h1>
          <p className="text-xs text-muted-foreground">Live from the listening room</p>
        </div>
      </motion.header>

      <main className="px-4 py-8">
        <div className="max-w-lg mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !data?.playing ? (
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              className="text-center py-20"
            >
              <Music2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">{data?.message || 'No song currently playing'}</p>
              {data?.slot && (
                <p className="text-sm text-muted-foreground mt-2">Current slot: {data.slot.displayTime}</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Now Playing
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {data.playing.track.albumArt && (
                    <img
                      src={data.playing.track.albumArt}
                      alt={data.playing.track.name}
                      className="w-32 h-32 rounded-xl object-cover shadow-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-foreground truncate">
                      {data.playing.track.name}
                    </p>
                    <p className="text-lg text-muted-foreground mt-1">
                      {data.playing.track.artist}
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Added by <span className="font-medium text-foreground">{data.playing.addedBy}</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Playing in <span className="font-medium text-foreground">{data.playing.slot}</span></span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
