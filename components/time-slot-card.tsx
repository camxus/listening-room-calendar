'use client'

import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimeSlot } from '@/lib/firebase'
import { formatTimeRange } from '@/lib/time-slots'

interface TimeSlotCardProps {
  slot: TimeSlot
  isSelected: boolean
  onSelect: () => void
  onJoinWaitlist?: () => void
}

export function TimeSlotCard({ slot, isSelected, onSelect, onJoinWaitlist }: TimeSlotCardProps) {
  const availableSpots = slot.capacity - slot.bookedCount
  const isFull = availableSpots <= 0
  const isLowAvailability = availableSpots <= 2 && !isFull

  return (
    <motion.button
      onClick={isFull ? onJoinWaitlist : onSelect}
      disabled={false}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, filter: 'blur(8px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'relative w-full p-4 rounded-xl border text-left transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
        isSelected && !isFull && 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20',
        !isSelected && !isFull && 'border-border bg-card hover:border-primary/30 hover:shadow-sm',
        isFull && 'border-border/50 bg-muted/30 cursor-pointer'
      )}
    >
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
            isSelected && !isFull ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            isFull && 'bg-muted text-muted-foreground'
          )}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className={cn(
              'font-semibold text-base',
              isFull && 'text-muted-foreground'
            )}>
              {slot.displayTime}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatTimeRange(slot.time)}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {isFull ? (
            <motion.span
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="px-3 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive"
            >
              Full
            </motion.span>
          ) : (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className={cn(
                'font-medium',
                isLowAvailability && 'text-accent'
              )}>
                {availableSpots} spots available
              </span>
            </div>
          )}
          {isFull && onJoinWaitlist && (
            <span className="text-xs text-primary font-medium">
              Join waitlist
            </span>
          )}
        </div>
      </div>

      {/* Low availability indicator */}
      {isLowAvailability && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: '100%' }}
          className="absolute bottom-0 left-0 h-0.5 rounded-b-xl bg-accent"
        />
      )}
    </motion.button>
  )
}

export function TimeSlotSkeleton() {
  return (
    <div className="w-full p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg skeleton" />
          <div className="space-y-2">
            <div className="w-20 h-4 rounded skeleton" />
            <div className="w-32 h-3 rounded skeleton" />
          </div>
        </div>
        <div className="w-16 h-6 rounded-full skeleton" />
      </div>
    </div>
  )
}

export function TimeSlotList({
  slots,
  selectedSlotId,
  onSelectSlot,
  onJoinWaitlist,
  isLoading,
}: {
  slots: TimeSlot[]
  selectedSlotId: string | null
  onSelectSlot: (slot: TimeSlot) => void
  onJoinWaitlist: (slot: TimeSlot) => void
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TimeSlotSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06, ease: [0.25, 0.46, 0.45, 0.94] },
        },
      }}
    >
      {slots.map((slot) => (
        <TimeSlotCard
          key={slot.id}
          slot={slot}
          isSelected={selectedSlotId === slot.id}
          onSelect={() => onSelectSlot(slot)}
          onJoinWaitlist={() => onJoinWaitlist(slot)}
        />
      ))}
    </motion.div>
  )
}
