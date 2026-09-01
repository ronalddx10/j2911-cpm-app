import { db } from './db';
import * as schema from './schema';
import { hashPassword } from '../auth';
import { eq, sql } from 'drizzle-orm';

async function main() {
  console.log('Seeding database via Drizzle...');

  // 1. Seed Offices
  const officesData = [
    { officeName: 'Finance Dept' },
    { officeName: 'HR Dept' },
    { officeName: 'Engineering' },
    { officeName: 'Operations' },
    { officeName: 'Sales' },
  ];

  const officesList = [];
  for (const data of officesData) {
    let office = await db.query.offices.findFirst({
      where: eq(schema.offices.officeName, data.officeName),
    });
    if (!office) {
      const inserted = await db.insert(schema.offices).values(data).returning();
      office = inserted[0];
    }
    officesList.push(office);
  }
  console.log(`Seeded ${officesList.length} offices.`);

  // 2. Seed Service Types
  const serviceTypesData = [
    { serviceName: 'Packed Meals (Delivery Only)' },
    { serviceName: 'Packed Meals (w/ Distribution)' },
    { serviceName: 'Food Tray (Delivery Only)' },
    { serviceName: 'Assisted Catering' },
    { serviceName: 'Full Catering' },
    { serviceName: 'VIP Catering' },
  ];

  // Map legacy names to new equivalents to prevent foreign key errors on existing orders
  const legacyMapping: Record<string, string> = {
    'Packed Meal': 'Packed Meals (Delivery Only)',
    'Buffet Set-up': 'Full Catering',
    'Delivery Only': 'Food Tray (Delivery Only)'
  };

  for (const [oldName, newName] of Object.entries(legacyMapping)) {
    const existingOld = await db.query.serviceTypes.findFirst({
      where: eq(schema.serviceTypes.serviceName, oldName),
    });
    if (existingOld) {
      // Check if new name already exists
      const existingNew = await db.query.serviceTypes.findFirst({
        where: eq(schema.serviceTypes.serviceName, newName),
      });
      if (!existingNew) {
        // Rename the old service type
        await db.update(schema.serviceTypes)
          .set({ serviceName: newName })
          .where(eq(schema.serviceTypes.id, existingOld.id));
      } else {
        // Map any orders referencing old to new, then delete old
        await db.update(schema.orders)
          .set({ serviceTypeId: existingNew.id })
          .where(eq(schema.orders.serviceTypeId, existingOld.id));
        await db.delete(schema.serviceTypes).where(eq(schema.serviceTypes.id, existingOld.id));
      }
    }
  }

  const serviceTypesList = [];
  for (const data of serviceTypesData) {
    let serviceType = await db.query.serviceTypes.findFirst({
      where: eq(schema.serviceTypes.serviceName, data.serviceName),
    });
    if (!serviceType) {
      const inserted = await db.insert(schema.serviceTypes).values(data).returning();
      serviceType = inserted[0];
    }
    serviceTypesList.push(serviceType);
  }
  console.log(`Seeded ${serviceTypesList.length} service types.`);

  // 3. Seed Order Statuses
  const statusesData = [
    { statusName: 'DRAFT' },
    { statusName: 'PENDING_APPROVAL' },
    { statusName: 'APPROVED' },
    { statusName: 'DELIVERED' },
    { statusName: 'COMPLETED' },
    { statusName: 'PAID' },
    { statusName: 'FOR_UPDATE' },
    { statusName: 'CANCELLED' },
  ];

  const statusesList = [];
  for (const data of statusesData) {
    let status = await db.query.orderStatuses.findFirst({
      where: eq(schema.orderStatuses.statusName, data.statusName),
    });
    if (!status) {
      const inserted = await db.insert(schema.orderStatuses).values(data).returning();
      status = inserted[0];
    }
    statusesList.push(status);
  }
  console.log(`Seeded ${statusesList.length} order statuses.`);

  // 4. Seed Venues
  const venuesData = [
    { venueName: 'Executive Hall B', capacity: 50, physicalAddress: '5th Floor, Main Building' },
    { venueName: 'Main Auditorium', capacity: 500, physicalAddress: 'Ground Floor, Annex Building' },
    { venueName: 'Meeting Room 4', capacity: 20, physicalAddress: '4th Floor, Tech Hub' },
    { venueName: 'Grand Ballroom', capacity: 300, physicalAddress: '2nd Floor, Recreation Center' },
  ];

  const venuesList = [];
  for (const data of venuesData) {
    let venue = await db.query.venues.findFirst({
      where: eq(schema.venues.venueName, data.venueName),
    });
    if (!venue) {
      const inserted = await db.insert(schema.venues).values(data).returning();
      venue = inserted[0];
    } else {
      await db.update(schema.venues)
        .set({ capacity: data.capacity, physicalAddress: data.physicalAddress })
        .where(eq(schema.venues.id, venue.id));
    }
    venuesList.push(venue);
  }
  console.log(`Seeded ${venuesList.length} venues.`);

  // 5. Seed Items
  const itemsData = [
    { itemName: 'Spam & Egg Rice', category: 'Breakfast' },
    { itemName: 'Pancakes with Syrup', category: 'Breakfast' },
    { itemName: 'Beef Tapa Rice', category: 'Breakfast' },
    { itemName: 'Tuna Sandwich', category: 'AM Snack' },
    { itemName: 'Carbonara Pasta', category: 'AM Snack' },
    { itemName: 'Chicken Adobo Rice', category: 'Lunch' },
    { itemName: 'Pork Sinigang Rice', category: 'Lunch' },
    { itemName: 'Beef Caldereta Rice', category: 'Lunch' },
    { itemName: 'Cinnamon Roll', category: 'PM Snack' },
    { itemName: 'Spaghetti with Garlic Bread', category: 'PM Snack' },
    { itemName: 'Grilled Salmon with Rice', category: 'Dinner' },
    { itemName: 'Salisbury Steak', category: 'Dinner' },
    { itemName: 'Pork Belly BBQ Rice', category: 'Dinner' },
    { itemName: 'Waiters (+1000 per waiter)', category: 'EXTRA', unitPrice: '1000.00' },
    { itemName: 'Water Dispenser (+500/DAY)', category: 'EXTRA', unitPrice: '500.00' },
    { itemName: 'Brewed Coffee (+70/HD)', category: 'EXTRA', unitPrice: '70.00' },
    { itemName: 'Chips and Nuts (+50/HD)', category: 'EXTRA', unitPrice: '50.00' },
  ];

  const itemsMap: Record<string, any> = {};
  for (const data of itemsData) {
    let item = await db.query.items.findFirst({
      where: eq(schema.items.itemName, data.itemName),
    });
    if (!item) {
      const inserted = await db.insert(schema.items).values({
        itemName: data.itemName,
        category: data.category,
        unitPrice: (data as any).unitPrice || '0.00',
      }).returning();
      item = inserted[0];
    } else {
      await db.update(schema.items)
        .set({ category: data.category, unitPrice: (data as any).unitPrice || '0.00' })
        .where(eq(schema.items.id, item.id));
    }
    itemsMap[item.itemName] = item;
  }
  console.log(`Seeded ${Object.keys(itemsMap).length} food items.`);

  // 6. Seed Menus
  const menusData = [
    {
      title: 'Standard Breakfast Set',
      description: 'Classic breakfast set with meat, egg, rice, or pancakes.',
      baseRate: '150.00',
      itemNames: ['Spam & Egg Rice', 'Pancakes with Syrup'],
    },
    {
      title: 'Premium Breakfast Feast',
      description: 'Hearty beef tapa breakfast with garlic rice and egg plus pancakes.',
      baseRate: '250.00',
      itemNames: ['Beef Tapa Rice', 'Pancakes with Syrup'],
    },
    {
      title: 'Classic Filipino Lunch',
      description: 'Satisfying traditional Filipino main course meal.',
      baseRate: '200.00',
      itemNames: ['Chicken Adobo Rice', 'Pork Sinigang Rice'],
    },
    {
      title: 'Grand Dinner Buffet',
      description: 'Gourmet selection including grilled salmon and premium steaks.',
      baseRate: '450.00',
      itemNames: ['Grilled Salmon with Rice', 'Salisbury Steak', 'Pork Belly BBQ Rice'],
    },
    {
      title: 'Standard Breakfast',
      description: 'Standard breakfast catering package',
      baseRate: '0.00',
      itemNames: [],
    },
    {
      title: 'Standard AM Snack',
      description: 'Standard morning snack package',
      baseRate: '0.00',
      itemNames: [],
    },
    {
      title: 'Standard Lunch',
      description: 'Standard lunch catering package',
      baseRate: '0.00',
      itemNames: [],
    },
    {
      title: 'Standard PM Snack',
      description: 'Standard afternoon snack package',
      baseRate: '0.00',
      itemNames: [],
    },
    {
      title: 'Standard Dinner',
      description: 'Standard dinner catering package',
      baseRate: '0.00',
      itemNames: [],
    },
  ];

  for (const data of menusData) {
    let menu = await db.query.menus.findFirst({
      where: eq(schema.menus.title, data.title),
    });
    if (!menu) {
      const inserted = await db.insert(schema.menus).values({
        title: data.title,
        description: data.description,
        baseRate: data.baseRate,
        isActive: true,
      }).returning();
      menu = inserted[0];
    } else {
      await db.update(schema.menus)
        .set({ description: data.description, baseRate: data.baseRate })
        .where(eq(schema.menus.id, menu.id));
    }

    // Clear existing links
    await db.delete(schema.menuItems).where(eq(schema.menuItems.menuId, menu.id));

    // Create links
    for (const name of data.itemNames) {
      const item = itemsMap[name];
      if (item) {
        await db.insert(schema.menuItems).values({
          menuId: menu.id,
          itemId: item.id,
        });
      }
    }
  }
  console.log(`Seeded ${menusData.length} menus and linked their items.`);

  // 7. Seed Clients (individual and organization)
  const existingClients = await db.select().from(schema.clients).limit(1);
  if (existingClients.length === 0) {
    const client1 = await db.insert(schema.clients).values({
      clientType: 'ORGANIZATION',
      organizationName: 'DX10 Consulting',
      firstName: 'Alice',
      lastName: 'Smith',
      location: '123 Innovation Way, Tech District',
      officeId: officesList[0].id,
      email: 'contact@dx10.com',
      phone: '09171234567',
    }).returning();

    const client2 = await db.insert(schema.clients).values({
      clientType: 'ORGANIZATION',
      organizationName: 'CCF Fairview Ministry',
      firstName: 'Pastor Mark',
      lastName: 'Reyes',
      location: 'Fairview Ave, Quezon City',
      officeId: officesList[1].id,
      email: 'info@ccffairview.org',
      phone: '09187654321',
    }).returning();

    const client3 = await db.insert(schema.clients).values({
      clientType: 'INDIVIDUAL',
      firstName: 'John',
      lastName: 'Doe',
      organizationName: 'Doe Enterprises',
      email: 'john.doe@gmail.com',
      phone: '09192223333',
    }).returning();
    console.log('Seeded 3 clients.');
  } else {
    console.log('Clients already exist, skipping.');
  }

  // 8. Seed Users (P2-6 Fix: Never overwrite existing live passwords)
  const userPassword = await hashPassword('user123');
  const adminPassword = await hashPassword('admin123');

  const testUser = await db.query.users.findFirst({
    where: eq(schema.users.username, 'user'),
  });
  if (!testUser) {
    await db.insert(schema.users).values({
      username: 'user',
      passwordHash: userPassword,
      role: 'USER',
    });
  }

  const adminUser = await db.query.users.findFirst({
    where: eq(schema.users.username, 'admin'),
  });
  if (!adminUser) {
    await db.insert(schema.users).values({
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    });
  }
  console.log('Seeded users (admin and user).');

  // 9. Seed Sample Order (with orderDays, mealPeriods, mealPeriodItems)
  const existingOrders = await db.select().from(schema.orders).limit(1);
  if (existingOrders.length === 0) {
    const clientsList = await db.select().from(schema.clients).limit(1);
    const menusList = await db.select().from(schema.menus).limit(1);
    const itemsList = await db.select().from(schema.items).limit(1);
    if (clientsList.length > 0 && menusList.length > 0) {
      const [order] = await db.insert(schema.orders).values({
        clientId: clientsList[0].id,
        venueId: venuesList[0].id,
        serviceTypeId: serviceTypesList[0].id,
        statusId: statusesList[0].id,
        grandTotal: '1500.00',
        createdByUserId: testUser?.id || adminUser?.id || BigInt(1),
      }).returning();

      const [orderDay] = await db.insert(schema.orderDays).values({
        orderId: order.id,
        eventDate: '2026-09-01',
      }).returning();

      const [mealPeriod] = await db.insert(schema.mealPeriods).values({
        orderDayId: orderDay.id,
        menuId: menusList[0].id,
        pax: 10,
        rate: '150.00',
        mealPeriod: 'Breakfast',
        customName: 'Morning Kickoff',
      }).returning();

      if (itemsList.length > 0) {
        await db.insert(schema.mealPeriodItems).values({
          mealPeriodId: mealPeriod.id,
          itemId: itemsList[0].id,
        });
      }
      console.log('Seeded sample order with meal period and meal period items.');
    }
  } else {
    console.log('Orders already exist, skipping sample order seed.');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  });
