'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { SpotifyTrack } from '@/lib/spotify'

export interface BookingData {
  slotId: string
  slotTime: string
  slotDisplayTime: string
  fullName: string
  email: string
  instagram: string
  friendCount: number
  friendNames: string[]
  selectedTrack: SpotifyTrack | null
}

interface BookingContextType {
  step: number
  setStep: (step: number) => void
  bookingData: BookingData
  updateBookingData: (data: Partial<BookingData>) => void
  resetBooking: () => void
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
}

const defaultBookingData: BookingData = {
  slotId: '',
  slotTime: '',
  slotDisplayTime: '',
  fullName: '',
  email: '',
  instagram: '',
  friendCount: 0,
  friendNames: [],
  selectedTrack: null,
}

const BookingContext = createContext<BookingContextType | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>(defaultBookingData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateBookingData = (data: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...data }))
  }

  const resetBooking = () => {
    setStep(1)
    setBookingData(defaultBookingData)
    setIsSubmitting(false)
  }

  return (
    <BookingContext.Provider value={{
      step,
      setStep,
      bookingData,
      updateBookingData,
      resetBooking,
      isSubmitting,
      setIsSubmitting,
    }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}
