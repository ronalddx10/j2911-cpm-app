import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const username = req.headers.get('x-username');
  const role = req.headers.get('x-role');

  if (!userId || !username || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authenticated.' } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      userId,
      username,
      role,
    },
  });
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.delete('token');
  return response;
}
