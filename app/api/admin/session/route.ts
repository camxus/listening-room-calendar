import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin'

export async function GET() {
  try {
    const authenticated = isAdminAuthenticated()
    
    if (authenticated) {
      return NextResponse.json({ authenticated: true })
    } else {
      return NextResponse.json({ authenticated: false })
    }
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json(
      { error: 'Session check failed' },
      { status: 500 }
    )
  }
}
