'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Image from 'next/image'
import { ExternalLink, CheckCircle2 } from 'lucide-react'
import {
  Disc3,
  GripVertical,
  Loader2,
  Music2,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QRCodeDisplay } from '@/components/ui/qr-code'
import { cn } from '@/lib/utils'
import { searchTracks } from '@/lib/spotify'
import { useDebounce } from '@/hooks/use-debounce'
import type { Booking, Playlist, PlaylistTrack, SpotifyTrack, TimeSlot } from '@/lib/firebase'

interface AdminPlaylistBuilderProps {
  slots: TimeSlot[]
  bookings: Booking[]
}

type PlaylistSource = 'booking' | 'search' | 'admin'

function defaultPlaylistName(slot?: TimeSlot | null) {
  return slot ? `COMBO X IMMERSIA: Slot ${slot.displayTime}` : ''
}

function getTrackKey(track: Pick<SpotifyTrack, 'id' | 'uri'>) {
  return track.uri || track.id
}

function isSameTrack(
  left: Pick<SpotifyTrack, 'id' | 'uri'>,
  right: Pick<SpotifyTrack, 'id' | 'uri'>
) {
  return getTrackKey(left) === getTrackKey(right)
}

function sourceLabel(source?: PlaylistSource) {
  if (source === 'booking') return 'Booking'
  if (source === 'search') return 'Search'
  return 'Admin'
}

export function AdminPlaylistBuilder({ slots, bookings }: AdminPlaylistBuilderProps) {
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [playlistName, setPlaylistName] = useState('')
  const [tracks, setTracks] = useState<PlaylistTrack[]>([])
  const [existingPlaylistId, setExistingPlaylistId] = useState<string | null>(null)
  const [savedSpotifyPlaylistId, setSavedSpotifyPlaylistId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [playlistJoinUrl, setPlaylistJoinUrl] = useState<string>('')

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedSlotId) || null,
    [slots, selectedSlotId]
  )

  const slotBookings = useMemo(
    () => bookings.filter((booking) => booking.slotId === selectedSlotId && booking.status !== 'cancelled'),
    [bookings, selectedSlotId]
  )

  const bookingSongs = useMemo(
    () => slotBookings.filter((booking) => booking.spotifyTrack),
    [slotBookings]
  )

  const includedBookingSongs = useMemo(
    () => tracks.filter((track) => track.source === 'booking').length,
    [tracks]
  )

  useEffect(() => {
    if (!selectedSlotId && slots.length > 0) {
      setSelectedSlotId(slots[0].id)
    }
  }, [selectedSlotId, slots])

  useEffect(() => {
    if (!selectedSlotId) return

    let cancelled = false
    const slot = selectedSlot

    async function loadPlaylist() {
      setIsLoadingPlaylist(true)
      setShowSuccess(false)
      try {
        const response = await fetch(`/api/playlists?slotId=${encodeURIComponent(selectedSlotId)}`)
        const data = await response.json()

        if (cancelled) return

        if (response.ok && data.playlists?.[0]) {
          const playlist = data.playlists[0] as Playlist
          setExistingPlaylistId(playlist.id)
          setSavedSpotifyPlaylistId(playlist.playlistId || null)
          setTracks(playlist.tracks || [])
          setPlaylistName(playlist.name || defaultPlaylistName(slot))
        } else {
          setExistingPlaylistId(null)
          setSavedSpotifyPlaylistId(null)
          setTracks([])
          setPlaylistName(defaultPlaylistName(slot))
        }
      } catch (error) {
        console.error('Failed to load playlist:', error)
        if (!cancelled) {
          setPlaylistName(defaultPlaylistName(slot))
        }
      } finally {
        if (!cancelled) setIsLoadingPlaylist(false)
      }
    }

    loadPlaylist()

    return () => {
      cancelled = true
    }
  }, [selectedSlotId, selectedSlot?.displayTime])

  useEffect(() => {
    async function search() {
      const query = debouncedSearchQuery.trim()

      if (!query) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchTracks(query)
        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
        toast.error('Failed to search Spotify')
      } finally {
        setIsSearching(false)
      }
    }

    search()
  }, [debouncedSearchQuery])

  function addTrack(track: SpotifyTrack, source: PlaylistSource, booking?: Booking) {
    const alreadyIncluded = tracks.some((existingTrack) => isSameTrack(existingTrack, track))

    if (alreadyIncluded) {
      toast('Song is already in the playlist')
      return
    }

    setTracks((currentTracks) => [
      ...currentTracks,
      {
        ...track,
        source,
        bookingId: booking?.bookingId || booking?.id,
        bookingName: booking?.fullName,
      },
    ])
  }

  function addBookingSong(booking: Booking) {
    if (!booking.spotifyTrack) return
    addTrack(booking.spotifyTrack, 'booking', booking)
  }

  function addAllBookingSongs() {
    bookingSongs.forEach((booking) => addBookingSong(booking))
  }

  function addSearchTrack(track: SpotifyTrack) {
    addTrack(track, 'search')
  }

  function removeTrack(index: number) {
    setTracks((currentTracks) => currentTracks.filter((_, trackIndex) => trackIndex !== index))
  }

  function moveTrack(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= tracks.length) return

    setTracks((currentTracks) => {
      const nextTracks = [...currentTracks]
      const [track] = nextTracks.splice(index, 1)
      nextTracks.splice(nextIndex, 0, track)
      return nextTracks
    })
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    setDraggingIndex(index)
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault()

    if (draggingIndex === null || draggingIndex === targetIndex) return

    setTracks((currentTracks) => {
      const nextTracks = [...currentTracks]
      const [track] = nextTracks.splice(draggingIndex, 1)
      nextTracks.splice(targetIndex, 0, track)
      return nextTracks
    })

    setDraggingIndex(null)
  }

  async function handleSavePlaylist() {
    if (!selectedSlot) {
      toast.error('Select a slot first')
      return
    }

    if (tracks.length === 0) {
      toast.error('Add at least one song to the playlist')
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: savedSpotifyPlaylistId,
          slotId: selectedSlot.id,
          slotDisplayTime: selectedSlot.displayTime,
          name: playlistName.trim() || defaultPlaylistName(selectedSlot),
          tracks,
        }),
      })

      const data = await response.json()

if (!response.ok) {
        console.log("Error:", response.body)
        throw new Error(data.error || 'Failed to save playlist')
      }

      setExistingPlaylistId(data.playlist?.id || existingPlaylistId)
      setSavedSpotifyPlaylistId(data.spotifyPlaylistId || data.playlist?.playlistId || null)

      const joinUrl = `${window.location.origin}/join/${data.playlist?.id || existingPlaylistId}`
      setPlaylistJoinUrl(joinUrl)

      if (data.spotifySkipped) {
        toast.success('Playlist saved locally')
        if (data.spotifySkipReason) toast.info(data.spotifySkipReason)
      } else {
        toast.success('Playlist created on Spotify')
      }
      setShowSuccess(true)
    } catch (error) {
      console.error('Failed to save playlist:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save playlist')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {showSuccess && playlistJoinUrl ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-8 text-center space-y-6"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Playlist Created!</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Share this QR code or link for guests to join:</p>
            <div className="inline-flex p-4 rounded-xl bg-white">
              <QRCodeDisplay value={playlistJoinUrl} size={180} />
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">{playlistJoinUrl}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigator.clipboard.writeText(playlistJoinUrl)}
              variant="outline"
              className="gap-2"
            >
              Copy Link
            </Button>
            <Button
              onClick={() => window.open(playlistJoinUrl, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Playlist
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-foreground mb-2">Slot</label>
                <select
                  value={selectedSlotId}
                  onChange={(event) => setSelectedSlotId(event.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  {slots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.displayTime} ({slot.bookedCount}/{slot.capacity} booked)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-foreground mb-2">Playlist name</label>
                <Input
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                  placeholder={defaultPlaylistName(selectedSlot)}
                />
              </div>
            </div>

            {selectedSlot && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{selectedSlot.displayTime}</Badge>
                <span>{bookingSongs.length} booking song{bookingSongs.length !== 1 ? 's' : ''}</span>
                <span>{includedBookingSongs} included from bookings</span>
                {savedSpotifyPlaylistId && (
                  <Badge variant="secondary">Spotify playlist saved</Badge>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Booking songs</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose songs submitted with this slot&apos;s bookings
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAllBookingSongs}
                    disabled={bookingSongs.length === 0}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add all
                  </Button>
                </div>

                <div className="p-4 space-y-3">
                  {isLoadingPlaylist ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : bookingSongs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Music2 className="w-8 h-8 mb-2 opacity-50" />
                      <p>No booking songs for this slot yet</p>
                    </div>
                  ) : (
                    bookingSongs.map((booking) => {
                      const track = booking.spotifyTrack
                      const included = track ? tracks.some((playlistTrack) => isSameTrack(playlistTrack, track)) : false

                      return (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-border/70 bg-secondary/20 p-3 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              {track?.albumArt && (
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  <Image
                                    src={track.albumArt}
                                    alt={track.album}
                                    fill
                                    className="object-cover"
                                    sizes="48px"
                                  />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{booking.fullName}</p>
                                <p className="text-xs text-muted-foreground">Group of {booking.groupSize}</p>
                                {track && (
                                  <>
                                    <p className="text-sm font-medium text-foreground truncate mt-1">
                                      {track.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                  </>
                                )}
                              </div>
                            </div>

                            {track && (
                              <Button
                                type="button"
                                variant={included ? 'secondary' : 'default'}
                                size="sm"
                                onClick={() => addBookingSong(booking)}
                                disabled={included}
                                className="gap-2"
                              >
                                {included ? <Disc3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {included ? 'Added' : 'Add'}
                              </Button>
                            )}
                          </div>

                          {booking.friendNames && booking.friendNames.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="w-3.5 h-3.5" />
                              <span>{booking.friendNames.filter(Boolean).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-2">Search Spotify</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by title, artist, or album..."
                      className="pl-9"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                      <Search className="w-8 h-8 mb-2 opacity-50" />
                      <p>Search Spotify to add extra songs</p>
                    </div>
                  ) : (
                    searchResults.map((track) => {
                      const included = tracks.some((playlistTrack) => isSameTrack(playlistTrack, track))

                      return (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-2 rounded-xl border border-border/70 bg-secondary/20"
                        >
                          {track.albumArt && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={track.albumArt}
                                alt={track.album}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                          </div>
                          <Button
                            type="button"
                            variant={included ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => addSearchTrack(track)}
                            disabled={included}
                          >
                            {included ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Playlist order</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag songs to rearrange, then create the playlist
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSavePlaylist}
                  disabled={isSaving || tracks.length === 0}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Disc3 className="w-4 h-4" />
                      Create Playlist
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 space-y-3">
                {tracks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Disc3 className="w-10 h-10 mb-3 opacity-40" />
                    <p className="font-medium">No songs selected yet</p>
                    <p className="text-sm">Add booking songs or search Spotify to build the playlist</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {tracks.map((track, index) => (
                      <motion.div
                        key={`${getTrackKey(track)}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        draggable
                        onDragStart={(event) => handleDragStart(event as unknown as DragEvent<HTMLDivElement>, index)}
                        onDragOver={(event) => handleDragOver(event as unknown as DragEvent<HTMLDivElement>)}
                        onDrop={(event) => handleDrop(event as unknown as DragEvent<HTMLDivElement>, index)}
                        className={cn(
                          'rounded-xl border bg-secondary/20 p-3 transition-colors',
                          draggingIndex === index
                            ? 'border-spotify/50 bg-spotify/5'
                            : 'border-border/70'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                            aria-label="Drag to reorder"
                          >
                            <GripVertical className="w-5 h-5" />
                          </button>

                          {track.albumArt && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={track.albumArt}
                                alt={track.album}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <Badge variant="outline">{sourceLabel(track.source)}</Badge>
                              {track.bookingName && (
                                <span className="text-xs text-muted-foreground truncate">
                                  Added by {track.bookingName}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => moveTrack(index, -1)}
                              disabled={index === 0}
                              aria-label="Move up"
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => moveTrack(index, 1)}
                              disabled={index === tracks.length - 1}
                              aria-label="Move down"
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeTrack(index)}
                              className="text-destructive hover:text-destructive"
                              aria-label="Remove song"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}
