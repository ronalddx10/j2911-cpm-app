import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { success: false, error: { message: 'Only administrators can modify catalog items.' } },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const itemId = BigInt(id);
    const { itemName, category, unitPrice } = await req.json();

    if (!itemName || !category) {
      return NextResponse.json(
        { success: false, error: { message: 'Item name and category are required.' } },
        { status: 400 }
      );
    }

    const priceNum = unitPrice != null ? Number(unitPrice) : 0.00;
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Unit price must be a valid non-negative number.' } },
        { status: 400 }
      );
    }

    const updatedList = await db.update(schema.items)
      .set({
        itemName,
        category,
        unitPrice: unitPrice != null ? String(unitPrice) : '0.00',
        updatedAt: new Date(),
        updatedByUserId: BigInt(userId),
      })
      .where(eq(schema.items.id, itemId))
      .returning();

    if (updatedList.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Item not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedList[0]),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { message: 'An item with this name already exists.' } },
        { status: 400 }
      );
    }
    console.error('Items PUT error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
