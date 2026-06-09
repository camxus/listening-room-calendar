// Generate time slots from 10:00 AM to 4:00 PM (30-minute intervals)
export interface TimeSlotConfig {
  id: string
  time: string // 24h format for storage
  displayTime: string // 12h format for display
}

export function generateTimeSlots(): TimeSlotConfig[] {
  const slots: TimeSlotConfig[] = []
  const startHour = 10 // 10:00 AM
  const endHour = 16 // 4:00 PM (last slot starts at 3:30 PM)
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute of [0, 30]) {
      // Don't add 4:00 PM slot (would end at 4:30 PM)
      if (hour === endHour - 1 && minute === 30) {
        // This is the 3:30 PM slot, include it
      }
      
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const hour12 = hour > 12 ? hour - 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayTime = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`
      
      slots.push({
        id: `slot-${time24.replace(':', '')}`,
        time: time24,
        displayTime,
      })
    }
  }
  
  return slots
}

export function formatTimeRange(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  
  // Calculate end time (30 minutes later)
  let endHours = hours
  let endMinutes = minutes + 30
  if (endMinutes >= 60) {
    endHours += 1
    endMinutes -= 60
  }
  
  const formatTime = (h: number, m: number) => {
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
  }
  
  return `${formatTime(hours, minutes)} - ${formatTime(endHours, endMinutes)}`
}
