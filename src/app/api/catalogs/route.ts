import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, asc, aliasedTable } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

export async function GET(req: NextRequest) {
  // Centralized middleware handles authorization check, x-user-id header is present
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const offices = await db.select().from(schema.offices).orderBy(asc(schema.offices.officeName));

    const serviceTypes = await db.select().from(schema.serviceTypes).orderBy(asc(schema.serviceTypes.serviceName));

    const venues = await db.select().from(schema.venues).orderBy(asc(schema.venues.venueName));

    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get('all') === 'true';

    const creatorUser = aliasedTable(schema.users, 'creator_user');
    const updaterUser = aliasedTable(schema.users, 'updater_user');

    let baseQuery = db
      .select({
        menuId: schema.menus.id,
        title: schema.menus.title,
        description: schema.menus.description,
        baseRate: schema.menus.baseRate,
        isActive: schema.menus.isActive,
        createdAt: schema.menus.createdAt,
        createdByUserId: schema.menus.createdByUserId,
        updatedByUserId: schema.menus.updatedByUserId,
        createdByName: creatorUser.username,
        updatedByName: updaterUser.username,
        itemId: schema.items.id,
        itemName: schema.items.itemName,
        category: schema.items.category,
      })
      .from(schema.menus)
      .leftJoin(schema.menuItems, eq(schema.menus.id, schema.menuItems.menuId))
      .leftJoin(schema.items, eq(schema.menuItems.itemId, schema.items.id))
      .leftJoin(creatorUser, eq(schema.menus.createdByUserId, creatorUser.id))
      .leftJoin(updaterUser, eq(schema.menus.updatedByUserId, updaterUser.id));

    if (!showAll) {
      baseQuery = baseQuery.where(eq(schema.menus.isActive, true)) as any;
    }

    const menuRows = await baseQuery.orderBy(asc(schema.menus.title));

    const menusMap = new Map<string, any>();
    for (const row of menuRows) {
      const mId = row.menuId.toString();
      if (!menusMap.has(mId)) {
        menusMap.set(mId, {
          id: row.menuId,
          title: row.title,
          description: row.description,
          baseRate: row.baseRate,
          isActive: row.isActive,
          createdAt: row.createdAt,
          createdByUserId: row.createdByUserId,
          updatedByUserId: row.updatedByUserId,
          createdByName: row.createdByName,
          updatedByName: row.updatedByName,
          menuItems: [],
        });
      }
      if (row.itemId) {
        menusMap.get(mId).menuItems.push({
          menuId: row.menuId,
          itemId: row.itemId,
          item: {
            id: row.itemId,
            itemName: row.itemName,
            category: row.category,
          },
        });
      }
    }
    const menus = Array.from(menusMap.values());

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        offices,
        serviceTypes,
        venues,
        menus,
      }),
    });
  } catch (error: any) {
    console.error('Catalog fetch error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
