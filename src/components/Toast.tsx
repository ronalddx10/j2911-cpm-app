import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  toast: { message: string; type: 'success' | 'error' } | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-5 right-5 z-[200] flex items-start gap-3 max-w-sm rounded-2xl px-5 py-4 shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 ${
        toast.type === 'success'
          ? 'bg-emerald-600 text-white border-emerald-700'
          : 'bg-rose-600 text-white border-rose-700'
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <p className="text-sm font-semibold leading-snug">{toast.message}</p>
      <button onClick={onClose} className="ml-auto pl-2 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
