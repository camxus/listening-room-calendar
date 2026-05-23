'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, Clock, Users, ExternalLink, ArrowRight } from 'lucide-react'
import { BookingData } from '@/lib/booking-context'
import { formatTimeRange } from '@/lib/time-slots'
import { SpotifyTrackCard } from './spotify-search'

interface SuccessScreenProps {
  bookingData: BookingData
  onReset: () => void
}

export function SuccessScreen({ bookingData, onReset }: SuccessScreenProps) {
  const confettiRef = useRef(false)

  useEffect(() => {
    if (!confettiRef.current) {
      confettiRef.current = true

      const duration = 3000
      const animationEnd = Date.now() + duration
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 }

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now()

        if (timeLeft <= 0) {
          return clearInterval(interval)
        }

        const particleCount = 50 * (timeLeft / duration)

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#5046e5', '#8b7cf7', '#a5b4fc'],
        })

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#5046e5', '#8b7cf7', '#a5b4fc'],
        })
      }, 250)

      return () => clearInterval(interval)
    }
  }, [])

  const totalGroupSize = 1 + bookingData.friendCount

  const fadeBlurIn = {
    initial: { opacity: 0, filter: 'blur(8px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Success Header */}
      <motion.div
        {...fadeBlurIn}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Check className="w-10 h-10 text-primary" />
        </motion.div>

        <motion.h1
          {...fadeBlurIn}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-3xl font-bold text-foreground mb-2"
        >
          {"Almost There!"}
        </motion.h1>
        <motion.p
          {...fadeBlurIn}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-muted-foreground"
        >
          Your listening room slot is confirmed
        </motion.p>
      </motion.div>

      {/* RSVP Section - PROMINENT */}
      <motion.div
        {...fadeBlurIn}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="px-4 pb-6"
      >
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-2xl bg-primary/5 border-2 border-primary/20">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-foreground mb-1">
                Don't forget to RSVP
              </h2>
              <p className="text-sm text-muted-foreground">
                RSVP required to secure your spot
              </p>
            </div>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-14 rounded-xl bg-card border border-border/80 text-foreground font-bold text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              RSVP on Partiful
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Booking Summary */}
      <motion.div
        {...fadeBlurIn}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex-1 px-4 pb-4"
      >
        <div className="max-w-md mx-auto space-y-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Booking Details
          </p>

          {/* Time Slot Card */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">
                  {bookingData.slotDisplayTime}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTimeRange(bookingData.slotTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Group Size Card */}
          <div className="p-5 rounded-xl bg-card border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">
                  Group of {totalGroupSize}
                </p>
                <p className="text-sm text-muted-foreground">
                  {bookingData.fullName}
                  {bookingData.friendNames.length > 0 && ` + ${bookingData.friendNames.filter(Boolean).join(', ')}`}
                </p>
              </div>
            </div>
          </div>

          {/* Song Preview */}
          {bookingData.selectedTrack && (
            <motion.div
              {...fadeBlurIn}
              transition={{ duration: 0.4, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Your Song
              </p>
              <SpotifyTrackCard track={bookingData.selectedTrack} />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Instagram Follow Section */}
      <motion.div
        {...fadeBlurIn}
        transition={{ duration: 0.5, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="px-4 pb-8"
      >
        <div className="max-w-md mx-auto">
          <p className="text-xs text-center text-muted-foreground mb-3">Follow us on Instagram for updates</p>
          <div className="flex gap-3">
            <a
              href="https://www.instagram.com/combo__cafe/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 rounded-xl bg-card border border-border/80 text-foreground font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Combo Cafe
            </a>
            <a
              href="https://www.instagram.com/immersia00"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 h-12 rounded-xl bg-card border border-border/80 text-foreground font-medium text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_6px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Immersia
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
