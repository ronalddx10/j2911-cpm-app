import React, { useState } from 'react';
import { UserPlus, X, AlertCircle } from 'lucide-react';
import { CatalogData } from '../types';

interface RegisterClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
  catalogs: CatalogData | null;
}

export const RegisterClientModal: React.FC<RegisterClientModalProps> = ({
  onClose,
  onSuccess,
  catalogs,
}) => {
  const [clientType, setClientType] = useState<'COMPANY' | 'GOVERNMENT' | 'INDIVIDUAL' | 'NON_PROFIT'>('COMPANY');
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientOrgName, setClientOrgName] = useState('');
  const [clientSecondaryContactName, setClientSecondaryContactName] = useState('');
  const [clientSecondaryContactPhone, setClientSecondaryContactPhone] = useState('');
  const [clientOfficeName, setClientOfficeName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientLocation, setClientLocation] = useState('');
  const [clientFormError, setClientFormError] = useState('');

  const isOrgType = clientType !== 'INDIVIDUAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError('');

    const payload = {
      clientType,
      firstName: clientFirstName || undefined,
      lastName: clientLastName || undefined,
      organizationName: isOrgType ? clientOrgName || undefined : clientOrgName || undefined,
      secondaryContactName: isOrgType && clientSecondaryContactName ? clientSecondaryContactName : undefined,
      secondaryContactPhone: isOrgType && clientSecondaryContactPhone ? clientSecondaryContactPhone : undefined,
      officeName: isOrgType && clientOfficeName ? clientOfficeName : undefined,
      email: clientEmail,
      phone: clientPhone,
      location: clientLocation || undefined,
    };

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setClientFormError(data.error?.message || 'Failed to create client.');
      }
    } catch (e) {
      setClientFormError('An error occurred while communicating with the database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-blue-600 dark:text-sky-400" />
            Register New Client Profile
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {clientFormError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{clientFormError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setClientType('COMPANY')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    clientType === 'COMPANY'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-sky-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  Company/Org
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('GOVERNMENT')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    clientType === 'GOVERNMENT'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-sky-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  Government
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('NON_PROFIT')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    clientType === 'NON_PROFIT'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-sky-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  Non-Profit
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('INDIVIDUAL')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                    clientType === 'INDIVIDUAL'
                      ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-sky-400'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-500'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            {isOrgType ? (
              <>
                <div>
                  <label htmlFor="orgName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {clientType === 'GOVERNMENT' ? 'Agency / Department Name' : clientType === 'NON_PROFIT' ? 'Organization / NGO Name' : 'Company / Organization Name'}
                  </label>
                  <input
                    type="text"
                    id="orgName"
                    value={clientOrgName}
                    onChange={(e) => setClientOrgName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. Acme Corp / Dept of Transportation"
                  />
                </div>
                
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Contact Person</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contactFirstName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                      <input
                        type="text"
                        id="contactFirstName"
                        value={clientFirstName}
                        onChange={(e) => setClientFirstName(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label htmlFor="contactLastName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        id="contactLastName"
                        value={clientLastName}
                        onChange={(e) => setClientLastName(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Secondary Contact Person (Optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="secContactName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Name</label>
                      <input
                        type="text"
                        id="secContactName"
                        value={clientSecondaryContactName}
                        onChange={(e) => setClientSecondaryContactName(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        placeholder="e.g. Jane Smith"
                      />
                    </div>
                    <div>
                      <label htmlFor="secContactPhone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Number</label>
                      <input
                        type="text"
                        id="secContactPhone"
                        value={clientSecondaryContactPhone}
                        onChange={(e) => setClientSecondaryContactPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        placeholder="e.g. 09XXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="orgLocation" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Official Address / Location</label>
                  <input
                    type="text"
                    id="orgLocation"
                    value={clientLocation}
                    onChange={(e) => setClientLocation(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. Suite 404, Building A, Tech Park"
                  />
                </div>
                <div>
                  <label htmlFor="officeInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Department / Office (Optional)</label>
                  <input
                    type="text"
                    id="officeInput"
                    value={clientOfficeName}
                    onChange={(e) => setClientOfficeName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. Finance Dept"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">First Name</label>
                    <input
                      type="text"
                      id="firstName"
                      value={clientFirstName}
                      onChange={(e) => setClientFirstName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      id="lastName"
                      value={clientLastName}
                      onChange={(e) => setClientLastName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="indOrgName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company / Organization (Optional)</label>
                  <input
                    type="text"
                    id="indOrgName"
                    value={clientOrgName}
                    onChange={(e) => setClientOrgName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                    placeholder="e.g. Associated company (optional)"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="client@mail.com"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  id="phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="09XXXXXXXXX"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow"
            >
              Register Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
