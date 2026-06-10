'use client'

import { useState, useEffect } from 'react'
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
  LogOut,
  Plus,
  Trash2,
  Settings,
  Save,
  X,
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
  const [activeTab, setActiveTab] = useState<'bookings' | 'waitlist' | 'slots'>('bookings')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null)
  const [newSlot, setNewSlot] = useState({ time: '', displayTime: '', capacity: 8 })
  const [isSavingSlot, setIsSavingSlot] = useState(false)

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

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/session')
        const data = await res.json()
        setIsAuthenticated(data.authenticated)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setLoginError(data.error || 'Login failed')
        return
      }

      setIsAuthenticated(true)
      setPassword('')
    } catch {
      setLoginError('Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAuthenticated(false)
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingSlot(true)

    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot),
      })

      if (res.ok) {
        setShowSlotForm(false)
        setNewSlot({ time: '', displayTime: '', capacity: 8 })
        mutateSlots()
      }
    } catch (error) {
      console.error('Failed to create slot:', error)
    } finally {
      setIsSavingSlot(false)
    }
  }

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSlot) return

    setIsSavingSlot(true)

    try {
      const res = await fetch('/api/slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSlot.id,
          capacity: editingSlot.capacity,
          displayTime: editingSlot.displayTime,
          waitlistEnabled: editingSlot.waitlistEnabled,
        }),
      })

      if (res.ok) {
        setEditingSlot(null)
        mutateSlots()
      }
    } catch (error) {
      console.error('Failed to update slot:', error)
    } finally {
      setIsSavingSlot(false)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slot?')) return

    try {
      const res = await fetch(`/api/slots?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        mutateSlots()
      }
    } catch (error) {
      console.error('Failed to delete slot:', error)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
      if (res.ok) {
        mutateBookings()
        mutateWaitlist()
        mutateSlots()
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error)
    }
  }

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

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage bookings</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Admin Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    )
  }

  const isLoading = slotsLoading || bookingsLoading || waitlistLoading

  const bookingsBySlot = bookings?.reduce((acc, booking) => {
    if (!acc[booking.slotId]) {
      acc[booking.slotId] = []
    }
    acc[booking.slotId].push(booking)
    return acc
  }, {} as Record<string, Booking[]>) || {}

  const totalBookings = bookings?.length || 0
  const totalGuests = bookings?.reduce((sum, b) => sum + b.groupSize, 0) || 0
  const songsSubmitted = bookings?.filter(b => b.spotifyTrack).length || 0

  return (
    <div className="min-h-screen bg-background">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
          <Button
            variant={activeTab === 'slots' ? 'default' : 'outline'}
            onClick={() => setActiveTab('slots')}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Slots
          </Button>
        </motion.div>

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
                                  <BookingCard
                                    key={booking.id}
                                    booking={booking}
                                    onCancel={() => handleCancelBooking(booking.bookingId || booking.id)}
                                  />
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
          ) : activeTab === 'waitlist' ? (
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
          ) : (
            <motion.div
              key="slots"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {!showSlotForm && (
                <Button onClick={() => setShowSlotForm(true)} className="w-full gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Slot
                </Button>
              )}

              {showSlotForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleCreateSlot}
                  className="p-4 rounded-2xl border border-border bg-card space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">New Slot</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSlotForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Time (24h)</label>
                      <Input
                        type="time"
                        value={newSlot.time}
                        onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Display Time</label>
                      <Input
                        type="text"
                        value={newSlot.displayTime}
                        onChange={(e) => setNewSlot({ ...newSlot, displayTime: e.target.value })}
                        placeholder="e.g. 2:00 PM"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Capacity</label>
                    <Input
                      type="number"
                      min="1"
                      value={newSlot.capacity}
                      onChange={(e) => setNewSlot({ ...newSlot, capacity: parseInt(e.target.value) || 8 })}
                    />
                  </div>
                  <Button type="submit" disabled={isSavingSlot} className="w-full">
                    {isSavingSlot ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Slot
                      </>
                    )}
                  </Button>
                </motion.form>
              )}

              {slotsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                (Array.isArray(slots) ? slots : []).map((slot) => {
                  const isEditing = editingSlot?.id === slot.id

                  if (isEditing) {
                    return (
                      <motion.form
                        key={slot.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onSubmit={handleUpdateSlot}
                        className="p-4 rounded-2xl border border-border bg-card space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Display Time</label>
                            <Input
                              type="text"
                              value={editingSlot.displayTime}
                              onChange={(e) => setEditingSlot({ ...editingSlot, displayTime: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Capacity</label>
                            <Input
                              type="number"
                              min="1"
                              value={editingSlot.capacity}
                              onChange={(e) => setEditingSlot({ ...editingSlot, capacity: parseInt(e.target.value) || 8 })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editingSlot.waitlistEnabled}
                              onChange={(e) => setEditingSlot({ ...editingSlot, waitlistEnabled: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm text-foreground">Waitlist Enabled</span>
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={isSavingSlot} className="flex-1">
                            {isSavingSlot ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingSlot(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </motion.form>
                    )
                  }

                  return (
                    <motion.div
                      key={slot.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-border bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                            <Clock className="w-5 h-5 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{slot.displayTime}</p>
                            <p className="text-sm text-muted-foreground">
                              Capacity: {slot.capacity} | Booked: {slot.bookedCount}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSlot(slot)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground">{booking.fullName}</p>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Group of {booking.groupSize}
            </span>
            {booking.status === 'waitlist' && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                Waitlist
              </span>
            )}
            {booking.status === 'cancelled' && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                Cancelled
              </span>
            )}
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

      <div className="flex items-center justify-between mt-3">
        {booking.createdAt && (
          <p className="text-xs text-muted-foreground/70">
            Booked {format(new Date(booking.createdAt), 'MMM d, h:mm a')}
          </p>
        )}
        {booking.status !== 'cancelled' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}
