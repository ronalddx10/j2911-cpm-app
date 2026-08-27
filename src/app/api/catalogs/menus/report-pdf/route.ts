import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { generateMenuCatalogPDF } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const menuRows = await db
      .select({
        menuId: schema.menus.id,
        title: schema.menus.title,
        description: schema.menus.description,
        baseRate: schema.menus.baseRate,
        isActive: schema.menus.isActive,
        createdAt: schema.menus.createdAt,
        itemId: schema.items.id,
        itemName: schema.items.itemName,
        category: schema.items.category,
      })
      .from(schema.menus)
      .leftJoin(schema.menuItems, eq(schema.menus.id, schema.menuItems.menuId))
      .leftJoin(schema.items, eq(schema.menuItems.itemId, schema.items.id))
      .orderBy(asc(schema.menus.title));

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

    const pdfString = generateMenuCatalogPDF(menus);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="menu_packages_report_${Date.now()}.pdf"`);

    return new NextResponse(Buffer.from(pdfString, 'binary'), {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Menu catalog report PDF error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
