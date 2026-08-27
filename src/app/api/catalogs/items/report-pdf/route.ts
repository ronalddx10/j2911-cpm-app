import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { generateMenuItemsPDF } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const items = await db
      .select()
      .from(schema.items)
      .orderBy(asc(schema.items.category), asc(schema.items.itemName));

    const pdfString = generateMenuItemsPDF(items);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="menu_items_report_${Date.now()}.pdf"`);

    return new NextResponse(Buffer.from(pdfString, 'binary'), {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Menu items report PDF error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
