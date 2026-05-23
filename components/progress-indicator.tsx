'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <div key={index} className="flex items-center">
            <motion.div
              className={cn(
                'relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-primary/20 text-primary',
                !isActive && !isCompleted && 'bg-muted text-muted-foreground'
              )}
              animate={{
                scale: isActive ? 1.1 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {isCompleted ? (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </motion.svg>
              ) : (
                stepNumber
              )}
              
              {isActive && (
                <motion.div
                  layoutId="active-step"
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.div>

            {index < totalSteps - 1 && (
              <div className="w-8 h-0.5 bg-muted mx-1">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: isCompleted ? '100%' : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface StepLabelsProps {
  currentStep: number
  labels: string[]
}

export function StepLabels({ currentStep, labels }: StepLabelsProps) {
  return (
    <div className="flex justify-between mt-2">
      {labels.map((label, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep

        return (
          <motion.span
            key={index}
            className={cn(
              'text-xs transition-colors',
              isActive && 'text-foreground font-medium',
              isCompleted && 'text-primary',
              !isActive && !isCompleted && 'text-muted-foreground'
            )}
            animate={{ opacity: isActive ? 1 : 0.7 }}
          >
            {label}
          </motion.span>
        )
      })}
    </div>
  )
}
