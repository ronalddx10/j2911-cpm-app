import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { serializeBigInt } from '@/lib/serialize';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  if (role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { message: 'Only administrators can create venues.' } },
      { status: 403 }
    );
  }

  try {
    const { venueName, capacity, physicalAddress } = await req.json();
    if (!venueName || !capacity || !physicalAddress) {
      return NextResponse.json(
        { success: false, error: { message: 'Venue name, capacity, and physical address are required.' } },
        { status: 400 }
      );
    }

    if (Number(capacity) <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Capacity must be greater than zero.' } },
        { status: 400 }
      );
    }

    const insertedList = await db.insert(schema.venues)
      .values({
        venueName,
        capacity: Number(capacity),
        physicalAddress,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: serializeBigInt(insertedList[0]),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { message: 'A venue with this name already exists.' } },
        { status: 400 }
      );
    }
    console.error('Venues POST error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
