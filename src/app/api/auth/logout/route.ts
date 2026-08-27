import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears the server-side httpOnly session cookie, effectively ending the session.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('token');
  return response;
}
