import React from 'react';
import { FileEdit, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { Order } from '../types';

interface KpiCardsProps {
  orders: Order[];
}

export const KpiCards: React.FC<KpiCardsProps> = ({ orders }) => {
  const draftCount = orders.filter((o) => o.status.statusName === 'DRAFT').length;
  const pendingCount = orders.filter((o) => o.status.statusName === 'PENDING_APPROVAL').length;
  const approvedCount = orders.filter((o) => o.status.statusName === 'APPROVED').length;
  const approvedRevenue = orders
    .filter((o) => o.status.statusName === 'APPROVED')
    .reduce((sum, o) => sum + Number(o.grandTotal), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <FileEdit className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drafts Queue</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{draftCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Review</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Approved Orders</p>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{approvedCount}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
          <Calculator className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gross Sales</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 truncate">
            ₱{approvedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};
