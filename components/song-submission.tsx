'use client'

import { motion } from 'framer-motion'
import { SpotifySearch } from './spotify-search'
import { SpotifyTrack } from '@/lib/spotify'
import { Music } from 'lucide-react'

interface SongSubmissionProps {
  selectedTrack: SpotifyTrack | null
  onTrackSelect: (track: SpotifyTrack | null) => void
}

export function SongSubmission({ selectedTrack, onTrackSelect }: SongSubmissionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="p-6 rounded-2xl bg-gradient-to-br from-spotify/10 to-spotify/5 border border-spotify/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-spotify/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-spotify" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Add to the Playlist</h3>
            <p className="text-sm text-muted-foreground">Search for your song on Spotify</p>
          </div>
        </div>

        <SpotifySearch
          selectedTrack={selectedTrack}
          onSelectTrack={onTrackSelect}
        />
      </motion.div>

      {!selectedTrack && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          You can skip this step if you prefer not to submit a song
        </motion.p>
      )}
    </motion.div>
  )
}
