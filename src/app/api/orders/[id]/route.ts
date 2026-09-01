import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { serializeBigInt } from '@/lib/serialize';

// Helper to validate HH:MM time format
function validateTimeFormat(timeStr: string | null | undefined): boolean {
  if (!timeStr) return true;
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  return regex.test(timeStr);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);

    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
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
            approvedByUser: true,
            uploadedByUser: true,
          },
          orderBy: (oa, { desc }) => [desc(oa.createdAt)],
        },
        orderDays: {
          with: {
            mealPeriods: {
              with: {
                menu: true,
                mealPeriodItems: {
                  with: {
                    item: true,
                  },
                },
              },
            },
          },
          orderBy: (od, { asc }) => [asc(od.eventDate)],
        },
        history: {
          with: {
            fromStatus: true,
            toStatus: true,
            changedByUser: {
              columns: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: (oh, { desc }) => [desc(oh.createdAt)],
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: { message: 'Order not found.' } },
        { status: 404 }
      );
    }

    // Ownership / RLS check on GET
    if (role !== 'ADMIN' && order.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized to view this order.' } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
    });
  } catch (error: any) {
    console.error('Order GET error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-role');
  if (!userId || !role) {
    return NextResponse.json(
      { success: false, error: { message: 'Not authorized.' } },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const orderId = BigInt(id);

    const existingOrder = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      with: { status: true },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: { message: 'Order not found.' } },
        { status: 404 }
      );
    }

    // RLS check
    if (role !== 'ADMIN' && existingOrder.createdByUserId !== BigInt(userId)) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authorized to modify this order.' } },
        { status: 403 }
      );
    }

    // Edit Locking validation: Editable strictly in DRAFT or FOR_UPDATE (P1-4 fix)
    const statusName = existingOrder.status.statusName;
    const allowedEditStatuses = ['DRAFT', 'FOR_UPDATE'];
    
    if (role !== 'ADMIN') {
      if (!allowedEditStatuses.includes(statusName)) {
        return NextResponse.json(
          { success: false, error: { message: `Orders in ${statusName} status cannot be modified. Only DRAFT and FOR_UPDATE orders are editable.` } },
          { status: 409 }
        );
      }
    } else {
      // Even admins cannot rewrite line items on COMPLETED, DELIVERED, PAID, or CANCELLED states
      const lockedAdminStatuses = ['COMPLETED', 'DELIVERED', 'PAID', 'CANCELLED'];
      if (lockedAdminStatuses.includes(statusName)) {
        return NextResponse.json(
          { success: false, error: { message: `Orders in ${statusName} status are locked and cannot be edited.` } },
          { status: 409 }
        );
      }
    }

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
      pax, // Extract
      ingressTime,
      egressTime,
      specialInstructions,
      orderDays,
    } = body;

    // Validate pax
    if (pax === undefined || isNaN(Number(pax)) || Number(pax) <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Number of pax must be greater than 0.' } },
        { status: 400 }
      );
    }

    // Validate orderDays
    if (!orderDays || !Array.isArray(orderDays) || orderDays.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Required fields missing: event dates and meal periods.' } },
        { status: 400 }
      );
    }

    // Validate times
    if (!validateTimeFormat(ingressTime) || !validateTimeFormat(egressTime)) {
      return NextResponse.json(
        { success: false, error: { message: 'Ingress and egress times must be in HH:MM format.' } },
        { status: 400 }
      );
    }

    // Compute formatted delivery address if structured fields are provided
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

    // Validate address/venue:
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

    // Recalculate Grand Total & validate meal periods
    let calculatedGrandTotal = 0;

    for (const day of orderDays) {
      if (!day.eventDate || !day.mealPeriods || !Array.isArray(day.mealPeriods) || day.mealPeriods.length === 0) {
        return NextResponse.json(
          { success: false, error: { message: 'Each event day must contain a valid date and at least one meal period.' } },
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

    // Update everything in a single transaction
    const updatedOrder = await db.transaction(async (tx) => {
      // 1. Delete old order days (cascading deletes will handle child meal_periods & meal_period_items)
      await tx.delete(schema.orderDays).where(eq(schema.orderDays.orderId, orderId));

      // 2. Update order header
      const updatedHeaderList = await tx.update(schema.orders)
        .set({
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
          pax: Number(pax), // Update global pax
          ingressTime: ingressTime || null,
          egressTime: egressTime || null,
          grandTotal: calculatedGrandTotal.toFixed(2),
          specialInstructions,
          updatedAt: new Date(),
        })
        .where(eq(schema.orders.id, orderId))
        .returning();
      
      const order = updatedHeaderList[0];

      // 3. Recreate order days, meal periods & meal period items
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

      // 4. Log to history
      await tx.insert(schema.orderHistory).values({
        orderId: order.id,
        fromStatusId: existingOrder.statusId,
        toStatusId: existingOrder.statusId, // status unchanged by edit
        changedByUserId: BigInt(userId),
        remarks: 'Order details modified by user.',
      });

      return order;
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedOrder),
    });
  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { success: false, error: { message: error.message || 'An internal server error occurred.' } },
      { status: 500 }
    );
  }
}
