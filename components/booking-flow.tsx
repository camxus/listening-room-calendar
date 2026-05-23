'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'

import { TimeSlotList } from '@/components/time-slot-card'
import { BookingForm } from '@/components/booking-form'
import { SuccessScreen } from '@/components/success-screen'
import { ProgressIndicator } from '@/components/progress-indicator'
import { SpotifySearch } from '@/components/spotify-search'
import { BookingProvider, useBooking } from '@/lib/booking-context'
import { TimeSlot } from '@/lib/firebase'

const fetcher = (url: string) => fetch(url).then(res => res.json())

function BookingFlowContent() {
  const {
    step,
    setStep,
    bookingData,
    updateBookingData,
    resetBooking,
    isSubmitting,
    setIsSubmitting,
  } = useBooking()

  const { data: slots, isLoading, mutate } = useSWR<TimeSlot[]>('/api/slots', fetcher, {
    refreshInterval: 10000,
  })

  const [waitlistSlot, setWaitlistSlot] = useState<TimeSlot | null>(null)

  const handleSelectSlot = (slot: TimeSlot) => {
    updateBookingData({
      slotId: slot.id,
      slotTime: slot.time,
      slotDisplayTime: slot.displayTime,
    })
  }

  const handleJoinWaitlist = async (slot: TimeSlot) => {
    toast.info(`The ${slot.displayTime} slot is full. Waitlist coming soon!`)
  }

  const handleSubmit = async () => {
    if (!bookingData.fullName || !bookingData.email) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: bookingData.slotId,
          fullName: bookingData.fullName,
          email: bookingData.email,
          instagram: bookingData.instagram || null,
          friendNames: bookingData.friendNames.filter(Boolean),
          groupSize: 1 + bookingData.friendCount,
          spotifyTrack: bookingData.selectedTrack,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      mutate()
      setStep(4)
      toast.success('Booking confirmed!')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToStep2 = bookingData.slotId !== ''
  const canProceedToStep3 = !!(bookingData.fullName && bookingData.email)
  const canSubmit = bookingData.fullName && bookingData.email

  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
      filter: 'blur(8px)',
    }),
    animate: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 40 : -40,
      opacity: 0,
      filter: 'blur(8px)',
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    }),
  }

  if (step === 4) {
    return <SuccessScreen bookingData={bookingData} onReset={resetBooking} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="sticky top-0 z-50 px-4 py-6 bg-background/95 backdrop-blur-md border-b border-border"
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              COMBO X IMMERSIA: Listening Room
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Reserve your experience</p>
          </div>
          <ProgressIndicator currentStep={step} totalSteps={3} />
        </div>
      </motion.header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 overflow-hidden">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={1}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <motion.h2
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-2xl font-bold text-foreground mb-2"
                  >
                    Choose Your Time
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-muted-foreground"
                  >
                    Select a 30-minute listening room slot
                  </motion.p>
                </div>

                <TimeSlotList
                  slots={slots || []}
                  selectedSlotId={bookingData.slotId}
                  onSelectSlot={handleSelectSlot}
                  onJoinWaitlist={handleJoinWaitlist}
                  isLoading={isLoading}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={2}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <motion.h2
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-2xl font-bold text-foreground mb-2"
                  >
                    Complete Your Booking
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-muted-foreground"
                  >
                    {bookingData.slotDisplayTime} slot selected
                  </motion.p>
                </div>

                <BookingForm
                  fullName={bookingData.fullName}
                  email={bookingData.email}
                  instagram={bookingData.instagram}
                  friendCount={bookingData.friendCount}
                  friendNames={bookingData.friendNames}
                  onFullNameChange={(value) => updateBookingData({ fullName: value })}
                  onEmailChange={(value) => updateBookingData({ email: value })}
                  onInstagramChange={(value) => updateBookingData({ instagram: value })}
                  onFriendCountChange={(value) => updateBookingData({ friendCount: value })}
                  onFriendNamesChange={(names) => updateBookingData({ friendNames: names })}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={3}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <motion.h2
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-2xl font-bold text-foreground mb-2"
                  >
                    Choose Your Song
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="text-muted-foreground"
                  >
                    Pick one song to add to our listening room playlist
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <SpotifySearch
                    selectedTrack={bookingData.selectedTrack}
                    onSelectTrack={(track) => updateBookingData({ selectedTrack: track })}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer / CTA - Skeuomorphic flat buttons */}
      <motion.footer
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="sticky bottom-0 px-4 py-4 bg-background/95 backdrop-blur-md border-t border-border"
      >
        <div className="max-w-md mx-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-shrink-0 h-12 px-4 rounded-xl bg-card border border-border/80 text-foreground font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="flex-1 h-12 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-card disabled:border disabled:border-border/80 disabled:text-foreground disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:opacity-90 active:opacity-80"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!canProceedToStep3}
              className="flex-1 h-12 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-card disabled:border disabled:border-border/80 disabled:text-foreground disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:opacity-90 active:opacity-80"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-card disabled:border disabled:border-border/80 disabled:text-foreground disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] bg-primary text-primary-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)] hover:opacity-90 active:opacity-80"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  Confirm Booking
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </motion.footer>
    </div>
  )
}

export default function BookingFlow() {
  return (
    <BookingProvider>
      <BookingFlowContent />
    </BookingProvider>
  )
}
