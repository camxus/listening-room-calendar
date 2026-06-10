import { NextResponse } from 'next/server'
import { verifyAdminCredentials, createAdminSession } from '@/lib/admin'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (!verifyAdminCredentials(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    const sessionData = createAdminSession()
    const isProduction = process.env.NODE_ENV === 'production'
    
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', sessionData, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
