import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { asc, eq, aliasedTable } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const creatorUser = aliasedTable(schema.users, 'creator_user');
    const updaterUser = aliasedTable(schema.users, 'updater_user');

    const items = await db
      .select({
        id: schema.items.id,
        itemName: schema.items.itemName,
        category: schema.items.category,
        unitPrice: schema.items.unitPrice,
        createdAt: schema.items.createdAt,
        updatedAt: schema.items.updatedAt,
        createdByUserId: schema.items.createdByUserId,
        updatedByUserId: schema.items.updatedByUserId,
        createdByName: creatorUser.username,
        updatedByName: updaterUser.username,
      })
      .from(schema.items)
      .leftJoin(creatorUser, eq(schema.items.createdByUserId, creatorUser.id))
      .leftJoin(updaterUser, eq(schema.items.updatedByUserId, updaterUser.id))
      .orderBy(asc(schema.items.itemName));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(items),
    });
  } catch (error: any) {
    console.error('Items GET error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { itemName, category, unitPrice } = await req.json();
    if (!itemName || !category) {
      return NextResponse.json(
        { success: false, error: { message: 'Item name and category are required.' } },
        { status: 400 }
      );
    }

    const insertedList = await db.insert(schema.items)
      .values({
        itemName,
        category,
        unitPrice: unitPrice != null ? String(unitPrice) : '0.00',
        createdByUserId: BigInt(userId),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: serializeBigInt(insertedList[0]),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { message: 'An item with this name already exists.' } },
        { status: 400 }
      );
    }
    console.error('Items POST error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
