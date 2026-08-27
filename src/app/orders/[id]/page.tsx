import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db/db';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decryptSession } from '@/lib/auth-jwt';
import { serializeBigInt } from '@/lib/serialize';
import { OrderViewClient } from './OrderViewClient';
import { Client, Order, CatalogData, Venue, ServiceType, MenuCatalog } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderViewPage({ params }: PageProps) {
  // 1. Session check & authentication
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('token')?.value;
  const session = sessionToken ? await decryptSession(sessionToken) : null;

  if (!session) {
    redirect('/');
  }

  // 2. Fetch the target order along with relational details
  const { id } = await params;
  const orderId = BigInt(id);

  const orderData = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    with: {
      client: true,
      venue: true,
      serviceType: true,
      status: true,
      orderDays: {
        with: {
          mealPeriods: {
            with: {
              menu: {
                with: {
                  menuItems: {
                    with: {
                      item: true,
                    },
                  },
                },
              },
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
        },
        orderBy: (oh, { desc }) => [desc(oh.createdAt)],
      },
    },
  });

  if (!orderData) {
    notFound();
  }

  // RLS Enforcement: staff can only view their own drafts, admins see everything
  const isOwner = BigInt(session.userId) === orderData.createdByUserId;
  const isAdmin = session.role === 'ADMIN';

  if (!isAdmin && !isOwner) {
    redirect('/');
  }

  // 3. Fetch catalogs needed for edit drop-downs (venues, service types, clients, menus)
  const venues = await db.query.venues.findMany();
  const serviceTypes = await db.query.serviceTypes.findMany();
  const clients = await db.query.clients.findMany();
  const menus = await db.query.menus.findMany({
    where: eq(schema.menus.isActive, true),
    with: {
      menuItems: {
        with: {
          item: true,
        },
      },
    },
  });

  // Serialize BigInt values into strings to pass across the server-client boundary safely
  const serializedOrder = serializeBigInt(orderData) as unknown as Order;
  const serializedVenues = serializeBigInt(venues) as unknown as Venue[];
  const serializedServiceTypes = serializeBigInt(serviceTypes) as unknown as ServiceType[];
  const serializedClients = serializeBigInt(clients) as unknown as Client[];
  const serializedMenus = serializeBigInt(menus) as unknown as MenuCatalog[];
  const userSession = {
    userId: session.userId,
    username: session.username,
    role: session.role,
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <OrderViewClient
        initialOrder={serializedOrder}
        user={userSession}
        venues={serializedVenues}
        serviceTypes={serializedServiceTypes}
        clients={serializedClients}
        menus={serializedMenus}
      />
    </main>
  );
}
