'use client'

import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { User, Mail, Instagram, Users, Minus, Plus, X } from 'lucide-react'
interface BookingFormProps {
  fullName: string
  email: string
  instagram: string
  friendCount: number
  friendNames: string[]
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onInstagramChange: (value: string) => void
  onFriendCountChange: (value: number) => void
  onFriendNamesChange: (names: string[]) => void
}

export function BookingForm({
  fullName,
  email,
  instagram,
  friendCount,
  friendNames,
  onFullNameChange,
  onEmailChange,
  onInstagramChange,
  onFriendCountChange,
  onFriendNamesChange,
}: BookingFormProps) {
  const totalGroupSize = 1 + friendCount

  const handleFriendCountChange = (delta: number) => {
    const newCount = Math.max(0, Math.min(3, friendCount + delta))
    onFriendCountChange(newCount)
    
    if (newCount > friendNames.length) {
      onFriendNamesChange([...friendNames, ...Array(newCount - friendNames.length).fill('')])
    } else if (newCount < friendNames.length) {
      onFriendNamesChange(friendNames.slice(0, newCount))
    }
  }

  const handleFriendNameChange = (index: number, value: string) => {
    const newNames = [...friendNames]
    newNames[index] = value
    onFriendNamesChange(newNames)
  }

  const removeFriend = (index: number) => {
    const newNames = friendNames.filter((_, i) => i !== index)
    onFriendNamesChange(newNames)
    onFriendCountChange(friendCount - 1)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Personal Info Section */}
      <motion.div
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-4"
      >
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Your Details
        </h3>

        <div className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                className="pl-12 py-6 rounded-lg border-border bg-card shadow-sm focus:shadow-md transition-shadow"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className="pl-12 py-6 rounded-lg border-border bg-card shadow-sm focus:shadow-md transition-shadow"
                required
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-foreground font-medium">
              Instagram Handle <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="instagram"
                type="text"
                placeholder="@username"
                value={instagram}
                onChange={(e) => onInstagramChange(e.target.value)}
                className="pl-12 py-6 rounded-lg border-border bg-card shadow-sm focus:shadow-md transition-shadow"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Group Size Section */}
      <motion.div
        initial={{ opacity: 0, filter: 'blur(8px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Bringing Friends?
          </h3>
          <motion.div
            key={totalGroupSize}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">
              Group of {totalGroupSize}
            </span>
          </motion.div>
        </div>

        {/* Friend Counter */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-secondary border border-border">
          <span className="text-foreground font-medium">Number of friends</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleFriendCountChange(-1)}
              disabled={friendCount === 0}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                friendCount === 0
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-card text-foreground border border-border/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.08)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
              )}
            >
              <Minus className="w-5 h-5" />
            </button>
            <motion.span
              key={friendCount}
              initial={{ scale: 1.3, filter: 'blur(4px)' }}
              animate={{ scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-8 text-center text-xl font-bold text-foreground"
            >
              {friendCount}
            </motion.span>
            <button
              onClick={() => handleFriendCountChange(1)}
              disabled={friendCount >= 3}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                friendCount >= 3
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-card text-foreground border border-border/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.08)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]'
              )}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Friend Names */}
        <motion.div
          initial={false}
          animate={{ height: friendCount > 0 ? 'auto' : 0 }}
          className="overflow-hidden"
        >
          <div className="space-y-3 pt-2">
            {friendNames.map((name, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.3, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={`Friend ${index + 1} name`}
                    value={name}
                    onChange={(e) => handleFriendNameChange(index, e.target.value)}
                    className="pl-11 py-5 rounded-lg border-border bg-card shadow-sm focus:shadow-md transition-shadow"
                  />
                </div>
                <button
                  onClick={() => removeFriend(index)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

    </motion.div>
  )
}
