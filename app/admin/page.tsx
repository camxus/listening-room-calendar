'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { format } from 'date-fns'
import {
  Users,
  Clock,
  Music2,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  List,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { TimeSlot, Booking, WaitlistEntry } from '@/lib/firebase'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface SlotWithBookings extends TimeSlot {
  bookings: Booking[]
}

export default function AdminDashboard() {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist'>('bookings')

  const { data: slots, isLoading: slotsLoading, mutate: mutateSlots } = useSWR<TimeSlot[]>(
    '/api/slots',
    fetcher
  )

  const { data: bookings, isLoading: bookingsLoading, mutate: mutateBookings } = useSWR<Booking[]>(
    '/api/bookings',
    fetcher
  )

  const { data: waitlist, isLoading: waitlistLoading, mutate: mutateWaitlist } = useSWR<WaitlistEntry[]>(
    '/api/waitlist',
    fetcher
  )

  const isLoading = slotsLoading || bookingsLoading || waitlistLoading

  // Group bookings by slot
  const bookingsBySlot = bookings?.reduce((acc, booking) => {
    if (!acc[booking.slotId]) {
      acc[booking.slotId] = []
    }
    acc[booking.slotId].push(booking)
    return acc
  }, {} as Record<string, Booking[]>) || {}

  // Calculate stats
  const totalBookings = bookings?.length || 0
  const totalGuests = bookings?.reduce((sum, b) => sum + b.groupSize, 0) || 0
  const songsSubmitted = bookings?.filter(b => b.spotifyTrack).length || 0

  const handleRefresh = () => {
    mutateSlots()
    mutateBookings()
    mutateWaitlist()
  }

  const exportCSV = () => {
    if (!bookings) return

    const headers = ['Slot', 'Name', 'Email', 'Instagram', 'Group Size', 'Friends', 'Song', 'Artist', 'Created']
    const rows = bookings.map(b => {
      const slot = slots?.find(s => s.id === b.slotId)
      return [
        slot?.displayTime || b.slotId,
        b.fullName,
        b.email,
        b.instagram || '',
        b.groupSize.toString(),
        b.friendNames?.join('; ') || '',
        b.spotifyTrack?.name || '',
        b.spotifyTrack?.artist || '',
        b.createdAt ? format(new Date(b.createdAt), 'MMM d, h:mm a') : '',
      ]
    })

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `listening-room-bookings-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Listening Room Bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!bookings?.length}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalBookings}</p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalGuests}</p>
                <p className="text-xs text-muted-foreground">Total Guests</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-spotify/10 flex items-center justify-center">
                <Music2 className="w-5 h-5 text-spotify" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{songsSubmitted}</p>
                <p className="text-xs text-muted-foreground">Songs</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2"
        >
          <Button
            variant={activeTab === 'bookings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bookings')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Bookings by Slot
          </Button>
          <Button
            variant={activeTab === 'waitlist' ? 'default' : 'outline'}
            onClick={() => setActiveTab('waitlist')}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Waitlist ({waitlist?.length || 0})
          </Button>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'bookings' ? (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                (Array.isArray(slots) ? slots : []).map((slot) => {
                  const slotBookings = bookingsBySlot[slot.id] || []
                  const isExpanded = expandedSlot === slot.id

                  return (
                    <motion.div
                      key={slot.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-border bg-card overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                            <Clock className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{slot.displayTime}</p>
                            <p className="text-sm text-muted-foreground">
                              {slot.bookedCount}/{slot.capacity} booked
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {slotBookings.length} booking{slotBookings.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border p-4 space-y-3">
                              {slotBookings.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No bookings for this slot
                                </p>
                              ) : (
                                slotBookings.map((booking) => (
                                  <BookingCard key={booking.id} booking={booking} />
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waitlist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {waitlistLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : waitlist?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No one on the waitlist yet</p>
                </div>
              ) : (
                waitlist?.map((entry) => {
                  const slot = slots?.find(s => s.id === entry.slotId)
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-border bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{entry.fullName}</p>
                          <p className="text-sm text-muted-foreground">{entry.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {slot?.displayTime || entry.slotId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Group of {entry.groupSize}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">{booking.fullName}</p>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Group of {booking.groupSize}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{booking.email}</p>
          {booking.instagram && (
            <p className="text-sm text-muted-foreground">@{booking.instagram.replace('@', '')}</p>
          )}
          {booking.friendNames && booking.friendNames.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Friends: {booking.friendNames.filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {booking.spotifyTrack && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-spotify/10 max-w-[180px]">
            {booking.spotifyTrack.albumArt && (
              <img
                src={booking.spotifyTrack.albumArt}
                alt=""
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {booking.spotifyTrack.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {booking.spotifyTrack.artist}
              </p>
            </div>
          </div>
        )}
      </div>

      {booking.createdAt && (
        <p className="text-xs text-muted-foreground/70 mt-3">
          Booked {format(new Date(booking.createdAt), 'MMM d, h:mm a')}
        </p>
      )}
    </div>
  )
}
