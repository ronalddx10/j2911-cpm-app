import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, and, or, ilike, inArray, desc, sql } from 'drizzle-orm';
import { generateOrderListPDF } from '@/lib/pdf';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const rawLimit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const limit = Math.min(500, Math.max(1, isNaN(rawLimit) ? 100 : rawLimit)); // Cap limit between 1 and 500
    const rawPage = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const offset = (page - 1) * limit;

    let whereClause: any = undefined;

    if (statusFilter && statusFilter !== 'ALL') {
      const statusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, statusFilter)).limit(1);
      const statusRecord = statusList[0];
      if (statusRecord) {
        const statusCondition = eq(schema.orders.statusId, statusRecord.id);
        whereClause = whereClause ? and(whereClause, statusCondition) : statusCondition;
      } else {
        const falseCondition = sql`1 = 0`;
        whereClause = whereClause ? and(whereClause, falseCondition) : falseCondition;
      }
    }

    if (month && month !== 'ALL') {
      const mNum = Number(month);
      const monthCondition = or(
        sql`EXTRACT(MONTH FROM ${schema.orders.createdAt}) = ${mNum}`,
        sql`EXISTS (
          SELECT 1 FROM ${schema.orderDays} 
          WHERE ${schema.orderDays.orderId} = ${schema.orders.id} 
          AND EXTRACT(MONTH FROM ${schema.orderDays.eventDate}) = ${mNum}
        )`
      );
      whereClause = whereClause ? and(whereClause, monthCondition) : monthCondition;
    }

    if (year && year !== 'ALL') {
      const yNum = Number(year);
      const yearCondition = or(
        sql`EXTRACT(YEAR FROM ${schema.orders.createdAt}) = ${yNum}`,
        sql`EXISTS (
          SELECT 1 FROM ${schema.orderDays} 
          WHERE ${schema.orderDays.orderId} = ${schema.orders.id} 
          AND EXTRACT(YEAR FROM ${schema.orderDays.eventDate}) = ${yNum}
        )`
      );
      whereClause = whereClause ? and(whereClause, yearCondition) : yearCondition;
    }

    if (search) {
      const searchPattern = `%${search}%`;

      const clientMatches = await db
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          or(
            ilike(schema.clients.firstName, searchPattern),
            ilike(schema.clients.lastName, searchPattern),
            ilike(schema.clients.organizationName, searchPattern)
          )
        );
      const clientIds = clientMatches.map((c) => c.id);

      const venueMatches = await db
        .select({ id: schema.venues.id })
        .from(schema.venues)
        .where(ilike(schema.venues.venueName, searchPattern));
      const venueIds = venueMatches.map((v) => v.id);

      const searchConditions: any[] = [
        ilike(schema.orders.customDeliveryAddress, searchPattern),
      ];

      if (clientIds.length > 0) {
        searchConditions.push(inArray(schema.orders.clientId, clientIds));
      }
      if (venueIds.length > 0) {
        searchConditions.push(inArray(schema.orders.venueId, venueIds));
      }

      const searchNum = Number(search);
      if (!isNaN(searchNum) && Number.isInteger(searchNum)) {
        searchConditions.push(eq(schema.orders.id, BigInt(searchNum)));
      }

      const searchCondition = or(...searchConditions);

      if (whereClause) {
        whereClause = and(whereClause, searchCondition);
      } else {
        whereClause = searchCondition;
      }
    }

    console.log("Incoming report-pdf query params:", {
      statusFilter,
      search,
      month,
      year,
      page,
      limit,
      offset
    });

    const ordersData = await db.query.orders.findMany({
      where: whereClause,
      orderBy: [desc(schema.orders.id)],
      limit: limit || undefined,
      offset: offset,
      with: {
        client: true,
        venue: true,
        serviceType: true,
        status: true,
        orderDays: true,
      },
    });

    console.log("report-pdf fetched orders count:", ordersData.length);

    const pdfString = generateOrderListPDF(ordersData, {
      status: statusFilter,
      month,
      year,
      search
    });

    // Return raw PDF as application/pdf response
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="order_report_${Date.now()}.pdf"`);

    return new NextResponse(Buffer.from(pdfString, 'utf-8'), {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Order report PDF error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
