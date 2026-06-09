'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { Clock, Users, Mail, Instagram, Music, AlertTriangle, CheckCircle2, XCircle, ArrowLeft, Copy, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookingDetails {
  id: string
  bookingId: string
  slotId: string
  slotDisplayTime: string
  fullName: string
  email: string
  instagram?: string
  friendNames: string[]
  groupSize: number
  spotifyTrack?: {
    name: string
    artist: string
    album: string
    albumArt: string
  } | null
  createdAt: string
  status?: 'confirmed' | 'cancelled'
  cancelledAt?: string
}

const fadeBlurIn = {
  initial: { opacity: 0, filter: 'blur(8px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
}

export default function ManageBookingPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Booking not found. Please check your booking ID.')
          } else {
            throw new Error('Failed to fetch booking')
          }
          return
        }
        const data = await response.json()
        setBooking(data)
      } catch (err) {
        setError('Failed to load booking details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    if (bookingId) {
      fetchBooking()
    }
  }, [bookingId])

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel booking')
      }

      setCancelSuccess(true)
      setShowCancelConfirm(false)
      // Update local state
      setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking')
    } finally {
      setIsCancelling(false)
    }
  }

  const copyBookingId = () => {
    navigator.clipboard.writeText(bookingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <p className="text-muted-foreground">Loading booking details...</p>
        </motion.div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          {...fadeBlurIn}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.15)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </motion.div>
      </div>
    )
  }

  const isCancelled = booking?.status === 'cancelled'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        {...fadeBlurIn}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 px-4 py-6 bg-background/95 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Manage Booking</h1>
              <p className="text-xs text-muted-foreground">View and manage your reservation</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Status Banner */}
          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={cn(
              'p-4 rounded-xl border flex items-center gap-4',
              isCancelled 
                ? 'bg-destructive/5 border-destructive/20'
                : cancelSuccess
                  ? 'bg-green-50 border-green-200'
                  : 'bg-primary/5 border-primary/20'
            )}
          >
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              isCancelled 
                ? 'bg-destructive/10'
                : cancelSuccess
                  ? 'bg-green-100'
                  : 'bg-primary/10'
            )}>
              {isCancelled ? (
                <XCircle className="w-6 h-6 text-destructive" />
              ) : cancelSuccess ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className={cn(
                'font-semibold',
                isCancelled ? 'text-destructive' : cancelSuccess ? 'text-green-700' : 'text-primary'
              )}>
                {isCancelled ? 'Booking Cancelled' : cancelSuccess ? 'Cancellation Successful' : 'Booking Confirmed'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isCancelled 
                  ? 'This reservation has been cancelled'
                  : cancelSuccess
                    ? 'Your booking has been cancelled and you have been unsubscribed'
                    : 'Your listening room slot is reserved'}
              </p>
            </div>
          </motion.div>

          {/* Booking ID */}
          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <button
              onClick={copyBookingId}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary border border-border hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Booking ID</span>
                <span className="font-mono font-semibold text-foreground">{booking?.bookingId || bookingId}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Copy className="w-4 h-4" />
                {copied && <span className="text-xs text-primary">Copied!</span>}
              </div>
            </button>
          </motion.div>

          {/* Booking Details Card */}
          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Time Slot */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Slot</p>
                  <p className="font-semibold text-foreground">{booking?.slotDisplayTime}</p>
                </div>
              </div>

              {/* Guest Info */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest</p>
                  <p className="font-semibold text-foreground">{booking?.fullName}</p>
                  {booking && booking.groupSize > 1 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      +{booking.groupSize - 1} friend{booking.groupSize > 2 ? 's' : ''}: {booking.friendNames?.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-foreground">{booking?.email}</p>
                </div>
              </div>

              {/* Instagram */}
              {booking?.instagram && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Instagram className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Instagram</p>
                    <p className="font-semibold text-foreground">{booking.instagram}</p>
                  </div>
                </div>
              )}

              {/* Song */}
              {booking?.spotifyTrack && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-spotify/10 flex items-center justify-center">
                    <Music className="w-5 h-5 text-spotify" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Song Submission</p>
                    <div className="flex items-center gap-3 mt-2">
                      {booking.spotifyTrack.albumArt && (
                        <img 
                          src={booking.spotifyTrack.albumArt} 
                          alt={booking.spotifyTrack.album}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-foreground">{booking.spotifyTrack.name}</p>
                        <p className="text-sm text-muted-foreground">{booking.spotifyTrack.artist}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Booking Date Footer */}
            <div className="px-6 py-4 bg-secondary/50 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Booked on {booking?.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'Unknown date'}
              </p>
            </div>
          </motion.div>

          {/* Cancel Booking Section */}
          {!isCancelled && !cancelSuccess && (
            <motion.div
              {...fadeBlurIn}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <h3 className="font-semibold text-foreground mb-2">Cancel Booking</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Need to cancel? This will free up your spot for others and unsubscribe you from our mailing list.
              </p>

              <AnimatePresence mode="wait">
                {!showCancelConfirm ? (
                  <motion.button
                    key="cancel-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full py-3 rounded-xl border border-destructive/30 text-destructive font-medium hover:bg-destructive/5 transition-colors"
                  >
                    Cancel My Booking
                  </motion.button>
                ) : (
                  <motion.div
                    key="confirm-section"
                    initial={{ opacity: 0, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(8px)' }}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Are you sure?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This action cannot be undone. Your spot will be released and you will be unsubscribed from our communications.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={isCancelling}
                        className="flex-1 py-3 rounded-xl bg-card border border-border/80 text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.1)] transition-all disabled:opacity-50"
                      >
                        Keep Booking
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium shadow-lg hover:bg-destructive/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          'Yes, Cancel'
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Back to Home */}
          <motion.div
            {...fadeBlurIn}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="text-center"
          >
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
