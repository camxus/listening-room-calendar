'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Music2, Disc3 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SpotifyTrack, searchTracks } from '@/lib/spotify'
import { useDebounce } from '@/hooks/use-debounce'
import Image from 'next/image'

interface SpotifySearchProps {
  selectedTrack: SpotifyTrack | null
  onSelectTrack: (track: SpotifyTrack | null) => void
}

export function SpotifySearch({ selectedTrack, onSelectTrack }: SpotifySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const debouncedQuery = useDebounce(query, 300)

  const fetchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const tracks = await searchTracks(searchQuery)
      setResults(tracks)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTracks(debouncedQuery)
  }, [debouncedQuery, fetchTracks])

  const handleSelectTrack = (track: SpotifyTrack) => {
    onSelectTrack(track)
    setQuery('')
    setResults([])
    setIsFocused(false)
  }

  const handleClearSelection = () => {
    onSelectTrack(null)
  }

  const showResults = isFocused && (results.length > 0 || isLoading || query.length > 0)

  return (
    <div className="space-y-4">
      {/* Selected Track Display */}
      <AnimatePresence mode="wait">
        {selectedTrack && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <SpotifyTrackCard
              track={selectedTrack}
              isSelected
              onRemove={handleClearSelection}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Input */}
      {!selectedTrack && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a song to add..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              className={cn(
                'pl-12 pr-4 py-6 text-base rounded-lg border-border bg-card shadow-sm',
                'placeholder:text-muted-foreground/70',
                'focus:shadow-md focus:border-spotify/50 focus:ring-spotify/20',
                'transition-all duration-200'
              )}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute z-50 w-full mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              >
                <div className="max-h-72 overflow-y-auto p-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Disc3 className="w-6 h-6 text-spotify" />
                      </motion.div>
                    </div>
                  ) : results.length > 0 ? (
                    <motion.div
                      className="space-y-1"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: { staggerChildren: 0.03 },
                        },
                      }}
                    >
                      {results.map((track) => (
                        <motion.div
                          key={track.id}
                          variants={{
                            hidden: { opacity: 0, x: -10 },
                            visible: { opacity: 1, x: 0 },
                          }}
                        >
                          <SpotifyTrackItem
                            track={track}
                            onClick={() => handleSelectTrack(track)}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : query.length > 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Music2 className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No tracks found</p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function SpotifyTrackItem({
  track,
  onClick,
}: {
  track: SpotifyTrack
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, backgroundColor: 'rgba(0,0,0,0.03)' }}
      whileTap={{ scale: 0.99 }}
      className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors hover:bg-secondary"
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
          <div className="w-full h-full flex items-center justify-center">
            <Music2 className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {track.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {track.artist}
        </p>
      </div>
    </motion.button>
  )
}

function SpotifyTrackCard({
  track,
  isSelected,
  onRemove,
}: {
  track: SpotifyTrack
  isSelected?: boolean
  onRemove?: () => void
}) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl border p-4 shadow-sm',
      isSelected
        ? 'border-spotify/30 bg-spotify/5'
        : 'border-border bg-card'
    )}>
      {/* Spotify badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-spotify/10">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-spotify">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <span className="text-[10px] font-medium text-spotify uppercase tracking-wider">
          Spotify
        </span>
      </div>

      <div className="flex items-center gap-4">
        <motion.div
          className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 shadow-md"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {track.albumArt ? (
            <Image
              src={track.albumArt}
              alt={track.album}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music2 className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        <div className="flex-1 min-w-0 pr-8">
          <p className="font-semibold text-foreground truncate text-lg">
            {track.name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {track.artist}
          </p>
          <p className="text-xs text-muted-foreground/70 truncate mt-1">
            {track.album}
          </p>
        </div>
      </div>

      {onRemove && (
        <motion.button
          onClick={onRemove}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute bottom-3 right-3 p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  )
}

export { SpotifyTrackCard }
