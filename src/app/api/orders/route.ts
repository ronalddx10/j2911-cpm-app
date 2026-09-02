import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, and, or, ilike, inArray, desc, sql } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

// Helper to validate HH:MM time format
function validateTimeFormat(timeStr: string | null | undefined): boolean {
  if (!timeStr) return true; // Null is fine
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return regex.test(timeStr);
}

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
    const rawPage = Number(searchParams.get('page') || 1);
    const rawLimit = Number(searchParams.get('limit') || 20);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit)); // Clamp limit between 1 and 100
    const offset = (page - 1) * limit;

    let whereClause: any = undefined;



    if (statusFilter && statusFilter !== 'ALL') {
      const statusList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, statusFilter)).limit(1);
      const statusRecord = statusList[0];
      if (!statusRecord) {
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          }
        });
      }

      if (whereClause) {
        whereClause = and(whereClause, eq(schema.orders.statusId, statusRecord.id));
      } else {
        whereClause = eq(schema.orders.statusId, statusRecord.id);
      }
    }

    const month = searchParams.get('month');
    const year = searchParams.get('year');

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

    // Server-side search filter implementation
    if (search) {
      const searchPattern = `%${search}%`;

      // 1. Fetch matching client IDs
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

      // 2. Fetch matching venue IDs
      const venueMatches = await db
        .select({ id: schema.venues.id })
        .from(schema.venues)
        .where(ilike(schema.venues.venueName, searchPattern));
      const venueIds = venueMatches.map((v) => v.id);

      // 3. Construct sub-conditions
      const searchConditions: any[] = [
        ilike(schema.orders.customDeliveryAddress, searchPattern),
      ];

      if (clientIds.length > 0) {
        searchConditions.push(inArray(schema.orders.clientId, clientIds));
      }
      if (venueIds.length > 0) {
        searchConditions.push(inArray(schema.orders.venueId, venueIds));
      }

      // Check for numeric order ID match
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

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(whereClause);
    const total = Number(countResult[0]?.count || 0);

    const orderRows = await db.query.orders.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        client: {
          with: {
            office: true,
          },
        },
        venue: true,
        serviceType: true,
        status: true,
        attachments: {
          with: {
            approvedByUser: {
              columns: {
                id: true,
                username: true,
                role: true,
              },
            },
            uploadedByUser: {
              columns: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: (oa, { desc }) => [desc(oa.createdAt)],
        },
        orderDays: {
          orderBy: (od, { asc }) => [asc(od.eventDate)],
          with: {
            mealPeriods: {
              with: {
                menu: {
                  with: {
                    menuItems: {
                      with: {
                        item: true
                      }
                    }
                  }
                },
                mealPeriodItems: {
                  with: {
                    item: true
                  }
                }
              },
            },
          },
        },
      },
      orderBy: desc(schema.orders.createdAt),
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(orderRows),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const {
      clientId,
      venueId,
      venueName,
      eventName,
      unitNumber,
      floorNumber,
      buildingName,
      streetNumber,
      streetName,
      landmark,
      customDeliveryAddress,
      serviceTypeId,
      pax,
      ingressTime,
      egressTime,
      specialInstructions,
      initialStatus,
      orderDays,
    } = body;

    if (pax === undefined || isNaN(Number(pax)) || Number(pax) <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Number of pax must be greater than 0.' } },
        { status: 400 }
      );
    }

    if (!clientId || !serviceTypeId || !orderDays || !Array.isArray(orderDays) || orderDays.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Required fields missing: clientId, serviceTypeId, and event dates.' } },
        { status: 400 }
      );
    }

    if (!validateTimeFormat(ingressTime) || !validateTimeFormat(egressTime)) {
      return NextResponse.json(
        { success: false, error: { message: 'Ingress and egress times must be in discrete HH:MM format (24-hour).' } },
        { status: 400 }
      );
    }

    let computedAddress = (customDeliveryAddress || '').trim();
    const structuredParts = [
      unitNumber ? `Unit ${unitNumber}` : null,
      floorNumber ? `${floorNumber} Floor` : null,
      buildingName || null,
      streetNumber && streetName ? `${streetNumber} ${streetName}` : (streetName || streetNumber || null),
      landmark ? `(Landmark: ${landmark})` : null,
    ].filter(Boolean);

    if (structuredParts.length > 0) {
      computedAddress = structuredParts.join(', ');
    }

    let dbVenueId: bigint | null = null;
    let dbDeliveryAddress: string | null = null;

    if (venueId) {
      if (!/^\d+$/.test(String(venueId))) {
        return NextResponse.json(
          { success: false, error: { message: 'Invalid venue ID format.' } },
          { status: 400 }
        );
      }
      const venueList = await db.select().from(schema.venues).where(eq(schema.venues.id, BigInt(venueId))).limit(1);
      if (venueList.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'Selected venue does not exist.' } },
          { status: 400 }
        );
      }
      dbVenueId = BigInt(venueId);
      dbDeliveryAddress = computedAddress || venueList[0].physicalAddress;
    } else {
      if (!computedAddress || computedAddress.trim() === '') {
        return NextResponse.json(
          { success: false, error: { message: 'Delivery address is required.' } },
          { status: 400 }
        );
      }
      dbDeliveryAddress = computedAddress;
    }

    const clientList = await db.select().from(schema.clients).where(eq(schema.clients.id, BigInt(clientId))).limit(1);
    if (clientList.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Selected client does not exist.' } },
        { status: 400 }
      );
    }

    const serviceTypeList = await db.select().from(schema.serviceTypes).where(eq(schema.serviceTypes.id, BigInt(serviceTypeId))).limit(1);
    if (serviceTypeList.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Selected service type does not exist.' } },
        { status: 400 }
      );
    }

    let targetStatusName = 'DRAFT';
    if (role === 'ADMIN' && initialStatus === 'APPROVED') {
      targetStatusName = 'APPROVED';
    } else if (initialStatus === 'PENDING_APPROVAL') {
      targetStatusName = 'PENDING_APPROVAL';
    }

    const statusRecordList = await db.select().from(schema.orderStatuses).where(eq(schema.orderStatuses.statusName, targetStatusName)).limit(1);
    const targetStatus = statusRecordList[0];
    if (!targetStatus) {
      return NextResponse.json(
        { success: false, error: { message: `System status '${targetStatusName}' catalog is misconfigured.` } },
        { status: 500 }
      );
    }

    let calculatedGrandTotal = 0;

    for (const day of orderDays) {
      if (!day.eventDate || !day.mealPeriods || !Array.isArray(day.mealPeriods) || day.mealPeriods.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'Each event day must contain a valid date and meal periods.' } },
          { status: 400 }
        );
      }

      for (const meal of day.mealPeriods) {
        if (!meal.mealPeriod || !['Breakfast', 'AM Snack', 'Lunch', 'PM Snack', 'Dinner', 'Extra', 'Extras'].includes(meal.mealPeriod)) {
          return NextResponse.json(
            { success: false, error: { message: 'Invalid meal period value.' } },
            { status: 400 }
          );
        }
        if (meal.pax === undefined || isNaN(Number(meal.pax)) || Number(meal.pax) <= 0) {
          return NextResponse.json(
            { success: false, error: { message: 'Pax must be greater than 0.' } },
            { status: 400 }
          );
        }
        if (meal.rate === undefined || isNaN(Number(meal.rate)) || Number(meal.rate) < 0) {
          return NextResponse.json(
            { success: false, error: { message: 'Valid rate per pax is required.' } },
            { status: 400 }
          );
        }
        if (!meal.menuId && (!meal.customName || meal.customName.trim() === '')) {
          return NextResponse.json({ success: false, error: { message: 'Either a menu catalog or a custom package name must be provided.' } }, { status: 400 });
        }
        if (meal.itemIds && Array.isArray(meal.itemIds) && meal.itemIds.length > 0) {
          if (meal.itemIds.some((itemId: any) => !/^\d+$/.test(String(itemId)))) {
            return NextResponse.json({ success: false, error: { message: 'Invalid food item ID format.' } }, { status: 400 });
          }
        }
        if (meal.serviceTime && !validateTimeFormat(meal.serviceTime)) {
          return NextResponse.json(
            { success: false, error: { message: 'Service time must be in HH:MM format.' } },
            { status: 400 }
          );
        }

        calculatedGrandTotal += Number(meal.rate) * Number(meal.pax);
      }
    }

    const newOrder = await db.transaction(async (tx) => {
      const insertedOrders = await tx.insert(schema.orders).values({
        clientId: BigInt(clientId),
        venueId: dbVenueId,
        eventName: eventName || null,
        unitNumber: unitNumber || null,
        floorNumber: floorNumber || null,
        buildingName: buildingName || null,
        streetNumber: streetNumber || null,
        streetName: streetName || null,
        landmark: landmark || null,
        customDeliveryAddress: dbDeliveryAddress,
        serviceTypeId: BigInt(serviceTypeId),
        statusId: targetStatus.id,
        pax: Number(pax),
        ingressTime: ingressTime || null,
        egressTime: egressTime || null,
        grandTotal: calculatedGrandTotal.toFixed(2),
        specialInstructions,
        createdByUserId: BigInt(userId),
      }).returning();
      const order = insertedOrders[0];

      // Create order days, meal periods & meal period items
      for (const day of orderDays) {
        const insertedDays = await tx.insert(schema.orderDays).values({
          orderId: order.id,
          eventDate: day.eventDate,
        }).returning();
        const orderDay = insertedDays[0];

        for (const meal of day.mealPeriods) {
          const insertedMeals = await tx.insert(schema.mealPeriods).values({
            orderDayId: orderDay.id,
            menuId: meal.menuId ? BigInt(meal.menuId) : null,
            pax: Number(meal.pax),
            rate: String(meal.rate),
            mealPeriod: meal.mealPeriod,
            customName: meal.customName || null,
            serviceTime: meal.serviceTime || null,
          }).returning();
          const mealPeriodId = insertedMeals[0].id;

          if (meal.itemIds && Array.isArray(meal.itemIds) && meal.itemIds.length > 0) {
            await tx.insert(schema.mealPeriodItems).values(
              meal.itemIds.map((itemId: any) => ({
                mealPeriodId: mealPeriodId,
                itemId: BigInt(itemId),
              }))
            );
          }
        }
      }

      // Create order history record
      const remarks = targetStatusName === 'APPROVED'
        ? 'Booking created and approved by Administrator.'
        : targetStatusName === 'PENDING_APPROVAL'
        ? 'Booking submitted for review and approval.'
        : 'Order draft created.';

      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: targetStatus.id,
        toStatusId: targetStatus.id,
        changedByUserId: BigInt(userId),
        remarks,
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(newOrder),
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
