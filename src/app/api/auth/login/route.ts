import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth';
import { encryptSession } from '@/lib/auth-jwt';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'login-ip';
    const rateCheck = checkRateLimit(`login:${ip}`, 10, 60 * 1000); // Max 10 attempts per minute per IP

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: { message: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.` } },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds),
          },
        }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Username and password are required.' } },
        { status: 400 }
      );
    }

    const userList = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (userList.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials.' } },
        { status: 401 }
      );
    }

    const user = userList[0];

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials.' } },
        { status: 401 }
      );
    }

    const token = await encryptSession({
      userId: user.id.toString(),
      username: user.username,
      role: user.role,
      createdAt: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      data: {
        userId: user.id.toString(),
        username: user.username,
        role: user.role,
      },
    });

    // Set token in secure HTTP-only cookie (expiring in 12 hours)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 12 * 60 * 60, // 12 hours in seconds
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
