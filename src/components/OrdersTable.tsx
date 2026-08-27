import React from 'react';
import { ChevronRight, Download } from 'lucide-react';
import { Order } from '../types';
import { getStatusBadgeClass } from '../lib/designTokens';

interface OrdersTableProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  onDownloadInvoice: (orderId: string) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  onSelectOrder,
  onDownloadInvoice,
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
}) => {
  const startEntry = (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalCount);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">ID</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client / Organization</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Pax</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delivery Address</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Span</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Service Type</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Grand Total</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
              <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No catering order bookings found matching the filters.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const clientName = order.client.clientType === 'ORGANIZATION'
                  ? order.client.organizationName
                  : `${order.client.firstName} ${order.client.lastName}`;

                const deliveryAddress = order.venue
                  ? `${order.venue.venueName} (${order.venue.physicalAddress})`
                  : (order.customDeliveryAddress || 'N/A');

                const dateSpan = order.orderDays && order.orderDays.length > 0
                  ? order.orderDays.length === 1
                    ? new Date(order.orderDays[0].eventDate).toLocaleDateString()
                    : `${new Date(order.orderDays[0].eventDate).toLocaleDateString()} - ${new Date(order.orderDays[order.orderDays.length - 1].eventDate).toLocaleDateString()}`
                  : 'N/A';

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer"
                    onClick={() => onSelectOrder(order)}
                  >
                    <td className="py-4 px-6 font-mono text-xs text-slate-500">{order.id}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">{clientName}</td>
                    <td className="py-4 px-6 text-sm text-slate-900 dark:text-white text-center font-medium">{order.pax}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{deliveryAddress}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">{dateSpan}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">{order.serviceType?.serviceName || 'N/A'}</td>
                    <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-bold text-right">
                      ₱{Number(order.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(order.status.statusName)}`}>
                        {order.status.statusName.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onSelectOrder(order)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          title="View details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        {order.pdfGeneratedFlag && (
                          <button
                            onClick={() => onDownloadInvoice(order.id)}
                            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-sky-400"
                            title="Download invoice"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalCount > 0 && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{startEntry}</span> to{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{endEntry}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> entries
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
