import React, { useState } from 'react';
import { X, Download, MessageSquare, FileEdit, CheckCircle2, RefreshCw } from 'lucide-react';
import { Order } from '../types';

interface OrderDetailDrawerProps {
  selectedOrder: Order;
  user: { userId: string; username: string; role: string } | null;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onActionSuccess: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  selectedOrder,
  user,
  onClose,
  onEdit,
  onActionSuccess,
  showToast,
}) => {
  const [adminRemarks, setAdminRemarks] = useState('');
  const [remarksActionType, setRemarksActionType] = useState<'REJECT' | 'RETURN' | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleDownloadInvoice = (orderId: string) => {
    window.open(`/api/orders/${orderId}/pdf`, '_blank');
  };

  const handleOrderAction = async (action: string, orderId: string, remarksText = '') => {
    setActionLoading(action);
    // Route deprecated withdraw/reject actions to the unified cancel endpoint
    const apiPath = (action === 'withdraw' || action === 'reject') ? 'cancel' : action;
    try {
      const res = await fetch(`/api/orders/${orderId}/${apiPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: remarksText }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminRemarks('');
        setRemarksActionType(null);
        showToast(`Successfully completed: ${action}`, 'success');
        onActionSuccess();
      } else {
        showToast(data.error?.message || `Failed to perform ${action}.`, 'error');
      }
    } catch (e) {
      showToast('Error connecting to services. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-sky-400 px-2.5 py-1 rounded-full font-mono font-semibold uppercase">
            INV-2026-{selectedOrder.id}
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">Catering Order Summary</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content scroll area */}
      <div className="p-6 flex-1 overflow-y-auto space-y-8">
        {/* Order Status bar */}
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Current Status</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 uppercase">
              {selectedOrder.status.statusName.replace('_', ' ')}
            </span>
          </div>
          {selectedOrder.pdfGeneratedFlag && (
            <button
              onClick={() => handleDownloadInvoice(selectedOrder.id)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Get Invoice PDF
            </button>
          )}
        </div>

        {/* Basic Details */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800 pb-1.5">Booking Metadata</span>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="col-span-2">
              <span className="text-slate-500 block">Client Profile</span>
              <div className="mt-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedOrder.client.clientType !== 'INDIVIDUAL'
                      ? selectedOrder.client.organizationName || `${selectedOrder.client.firstName} ${selectedOrder.client.lastName}`
                      : `${selectedOrder.client.firstName} ${selectedOrder.client.lastName}`}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {selectedOrder.client.clientType}
                  </span>
                </div>
                {selectedOrder.client.clientType !== 'INDIVIDUAL' && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Primary Contact:</span> {selectedOrder.client.firstName} {selectedOrder.client.lastName}
                  </div>
                )}
                {selectedOrder.client.secondaryContactName && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Secondary Contact:</span> {selectedOrder.client.secondaryContactName}
                    {selectedOrder.client.secondaryContactPhone && ` (${selectedOrder.client.secondaryContactPhone})`}
                  </div>
                )}
                {selectedOrder.client.clientType === 'INDIVIDUAL' && selectedOrder.client.organizationName && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Associated Company:</span> {selectedOrder.client.organizationName}
                  </div>
                )}
                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                  <div><span className="font-medium text-slate-600 dark:text-slate-400">Email:</span> {selectedOrder.client.email}</div>
                  <div><span className="font-medium text-slate-600 dark:text-slate-400">Phone:</span> {selectedOrder.client.phone}</div>
                </div>
                {selectedOrder.client.clientType !== 'INDIVIDUAL' && selectedOrder.client.location && (
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Official Location:</span> {selectedOrder.client.location}
                  </div>
                )}
              </div>
            </div>
            {selectedOrder.eventName && (
              <div className="col-span-2">
                <span className="text-slate-500 block">Event Name</span>
                <span className="font-bold text-blue-600 dark:text-sky-400">{selectedOrder.eventName}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 block">Service Type</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.serviceType.serviceName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Guest Count (Pax)</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.pax} Pax</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Delivery Venue / Address</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedOrder.venue
                  ? `${selectedOrder.venue.venueName} (${selectedOrder.venue.physicalAddress})`
                  : selectedOrder.customDeliveryAddress}
              </span>
              {selectedOrder.landmark && (
                <span className="text-xs text-slate-500 block mt-0.5">
                  Landmark: <em>{selectedOrder.landmark}</em>
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-500 block">Ingress Setup Time</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {selectedOrder.ingressTime ? String(selectedOrder.ingressTime).substring(0, 5) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Egress Cleanup Time</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">
                {selectedOrder.egressTime ? String(selectedOrder.egressTime).substring(0, 5) : 'N/A'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Special Instructions</span>
              <span className="text-slate-600 dark:text-slate-300 italic">{selectedOrder.specialInstructions || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Document Attachments ({selectedOrder.attachments?.length || 0})
            </span>
          </div>
          {selectedOrder.attachments && selectedOrder.attachments.length > 0 ? (
            <div className="space-y-2">
              {selectedOrder.attachments.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                  <div className="min-w-0">
                    <a href={att.filePath} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 dark:text-sky-400 hover:underline truncate block">
                      {att.fileName}
                    </a>
                    <span className="text-slate-400 text-[11px]">{att.documentType.replace(/_/g, ' ')} • {(att.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                  <div>
                    {att.isApproved ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Approved
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2">No attachments uploaded for this order yet.</div>
          )}
        </div>

        {/* Day Scheduling Map */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800 pb-1.5">Scheduling Meal Allocations</span>
          <div className="space-y-4">
            {selectedOrder.orderDays.map((day: any, idx: number) => (
              <div key={day.id} className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Day {idx + 1}: {new Date(day.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 pl-4 border-l border-slate-200 dark:border-slate-800">
                  {day.mealPeriods.map((meal: any) => (
                    <div key={meal.id} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">{meal.menu?.title || meal.customName || 'Package'}</span>
                        <span className="text-slate-500">Linked Food Items: {meal.mealPeriodItems?.map((i: any) => i.item?.itemName).join(', ') || 'N/A'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold block">{meal.pax} Pax</span>
                        <span className="text-slate-500">PHP {Number(meal.rate).toFixed(2)}/pax</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-500">Grand Bill Estimate:</span>
            <span className="text-xl font-extrabold text-blue-600 dark:text-sky-400">₱{Number(selectedOrder.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Revision History & Audit Trail */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800 pb-1.5">Revision Audit Ledger</span>
          <div className="flow-root">
            <ul className="-mb-8">
              {selectedOrder.history.map((log: any, logIdx: number) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== selectedOrder.history.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-8 ring-white dark:ring-slate-900">
                          <MessageSquare className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-slate-800 dark:text-slate-200">
                            {log.remarks}
                          </p>
                          <div className="mt-1 flex items-center space-x-2 text-xs text-slate-400">
                            <span>State: {log.fromStatus?.statusName || 'NULL'} → <strong>{log.toStatus?.statusName}</strong></span>
                          </div>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-slate-400">
                          <time dateTime={log.createdAt}>{new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Admin action remarks input prompt overlay */}
      {remarksActionType && (
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <label htmlFor="remarksText" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Provide {remarksActionType === 'REJECT' ? 'Cancellation Reason' : 'Update Guidance Instructions'} (Required)
          </label>
          <input
            type="text"
            id="remarksText"
            value={adminRemarks}
            onChange={(e) => setAdminRemarks(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
            placeholder={`Explain why the order is being ${remarksActionType === 'REJECT' ? 'cancelled' : 'returned'}...`}
          />
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => { setRemarksActionType(null); setAdminRemarks(''); }}
              className="py-1 px-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => handleOrderAction(remarksActionType === 'REJECT' ? 'cancel' : 'return', selectedOrder.id, adminRemarks)}
              className="py-1 px-3 bg-red-600 text-white rounded text-xs font-bold"
            >
              Confirm {remarksActionType === 'REJECT' ? 'Cancellation' : 'Return'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions Footer */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
        {/* User actions */}
        {user?.role === 'USER' && (
          <div className="flex gap-2">
            {(selectedOrder.status.statusName === 'DRAFT' || selectedOrder.status.statusName === 'FOR_UPDATE') && (
              <>
                <button
                  onClick={() => onEdit(selectedOrder)}
                  disabled={!!actionLoading}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center transition-all"
                >
                  <FileEdit className="w-4 h-4 mr-1.5" /> Edit Booking
                </button>
                <button
                  onClick={() => handleOrderAction('submit', selectedOrder.id)}
                  disabled={!!actionLoading}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center transition-all"
                >
                  {actionLoading === 'submit' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Submit Request
                </button>
              </>
            )}
            {(selectedOrder.status.statusName === 'DRAFT' || selectedOrder.status.statusName === 'PENDING_APPROVAL') && (
              <button
                onClick={() => handleOrderAction('cancel', selectedOrder.id)}
                disabled={!!actionLoading}
                className="py-2 px-4 border border-red-300 hover:bg-red-50 text-red-600 dark:border-red-950/30 dark:hover:bg-red-950/20 disabled:opacity-60 rounded-lg text-sm font-semibold transition-all"
              >
                {actionLoading === 'cancel' ? <RefreshCw className="w-4 h-4 animate-spin inline mr-1" /> : null} Cancel Booking
              </button>
            )}
          </div>
        )}

        {/* Admin actions */}
        {user?.role === 'ADMIN' && (selectedOrder.status.statusName === 'DRAFT' || selectedOrder.status.statusName === 'FOR_UPDATE') && !remarksActionType && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to approve this draft order?')) {
                  handleOrderAction('approve', selectedOrder.id);
                }
              }}
              disabled={!!actionLoading}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center transition-all shadow"
            >
              {actionLoading === 'approve' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Submit & Approve
            </button>
            <button
              onClick={() => onEdit(selectedOrder)}
              disabled={!!actionLoading}
              className="py-2 px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold transition-all"
            >
              <FileEdit className="w-4 h-4 mr-1.5 inline" /> Edit Booking
            </button>
          </div>
        )}

        {user?.role === 'ADMIN' && selectedOrder.status.statusName === 'PENDING_APPROVAL' && !remarksActionType && (
          <div className="flex gap-2">
            <button
              onClick={() => handleOrderAction('approve', selectedOrder.id)}
              disabled={!!actionLoading}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center transition-all shadow"
            >
              {actionLoading === 'approve' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Approve Booking
            </button>
            <button
              onClick={() => setRemarksActionType('RETURN')}
              disabled={!!actionLoading}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-all"
            >
              Return for Update
            </button>
            <button
              onClick={() => setRemarksActionType('REJECT')}
              disabled={!!actionLoading}
              className="py-2 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-all"
            >
              Cancel Booking
            </button>
          </div>
        )}

        {/* State Transitions: DELIVERED, COMPLETED, PAID */}
        {selectedOrder.status.statusName === 'APPROVED' && (
          <button
            onClick={() => handleOrderAction('deliver', selectedOrder.id)}
            disabled={!!actionLoading}
            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
          >
            {actionLoading === 'deliver' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Mark as DELIVERED
          </button>
        )}

        {selectedOrder.status.statusName === 'DELIVERED' && (
          <button
            onClick={() => handleOrderAction('complete', selectedOrder.id)}
            disabled={!!actionLoading}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
          >
            {actionLoading === 'complete' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Mark as COMPLETED
          </button>
        )}

        {selectedOrder.status.statusName === 'COMPLETED' && user?.role === 'ADMIN' && (
          <button
            onClick={() => handleOrderAction('pay', selectedOrder.id)}
            disabled={!!actionLoading}
            className="py-2 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
          >
            {actionLoading === 'pay' ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />} Mark as PAID
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
