'use client'

import { QRCodeCanvas } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  className?: string
}

export function QRCodeDisplay({ value, size = 128, className }: QRCodeDisplayProps) {
  return (
    <div className={className}>
      <QRCodeCanvas
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#000000"
        level="M"
        marginSize={2}
      />
    </div>
  )
}