import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const menuId = BigInt(id);

    const existingMenu = await db.query.menus.findFirst({
      where: eq(schema.menus.id, menuId),
    });

    if (!existingMenu) {
      return NextResponse.json(
        { success: false, error: { message: 'Menu not found.' } },
        { status: 404 }
      );
    }

    const { title, description, baseRate, isActive, itemIds } = await req.json();

    const updatedMenu = await db.transaction(async (tx) => {
      const updatedList = await tx.update(schema.menus)
        .set({
          title: title !== undefined ? title : existingMenu.title,
          description: description !== undefined ? description : existingMenu.description,
          baseRate: baseRate !== undefined ? Number(baseRate).toFixed(2) : existingMenu.baseRate,
          isActive: isActive !== undefined ? Boolean(isActive) : existingMenu.isActive,
          updatedAt: new Date(),
          updatedByUserId: BigInt(userId),
        })
        .where(eq(schema.menus.id, menuId))
        .returning();

      if (Array.isArray(itemIds)) {
        // Delete existing items for this menu
        await tx.delete(schema.menuItems).where(eq(schema.menuItems.menuId, menuId));
        // Add new items
        for (const itemId of itemIds) {
          await tx.insert(schema.menuItems).values({
            menuId,
            itemId: BigInt(itemId),
          });
        }
      }

      return updatedList[0];
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedMenu),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: { message: 'A menu package with this title already exists.' } },
        { status: 400 }
      );
    }
    console.error('Menu PATCH error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
