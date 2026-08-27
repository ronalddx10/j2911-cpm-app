import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { serializeBigInt } from '@/lib/serialize';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { title, description, baseRate, itemIds } = await req.json();
    if (!title || !baseRate) {
      return NextResponse.json(
        { success: false, error: { message: 'Menu title and base rate are required.' } },
        { status: 400 }
      );
    }

    if (Number(baseRate) < 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Base rate cannot be negative.' } },
        { status: 400 }
      );
    }

    const newMenu = await db.transaction(async (tx) => {
      const insertedMenu = await tx.insert(schema.menus)
        .values({
          title,
          description: description || null,
          baseRate: Number(baseRate).toFixed(2),
          isActive: true,
          createdByUserId: BigInt(userId),
        })
        .returning();

      const menu = insertedMenu[0];

      if (Array.isArray(itemIds) && itemIds.length > 0) {
        for (const itemId of itemIds) {
          await tx.insert(schema.menuItems).values({
            menuId: menu.id,
            itemId: BigInt(itemId),
          });
        }
      }
      return menu;
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(newMenu),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { message: 'A menu with this title already exists.' } },
        { status: 400 }
      );
    }
    console.error('Menus POST error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
