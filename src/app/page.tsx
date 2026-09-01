'use client';

import React, { useState, useEffect } from 'react';
import {
  Sun, Moon, Activity, LogOut, Search, Filter, UserPlus, Plus, RefreshCw, AlertCircle, ArrowRight, FileDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { KpiCards } from '../components/KpiCards';
import { RegisterClientModal } from '../components/RegisterClientModal';
import { BookingWizardModal } from '../components/BookingWizardModal';
import { OrderDetailDrawer } from '../components/OrderDetailDrawer';
import { OrdersTable } from '../components/OrdersTable';
import { CatalogManager } from '../components/CatalogManager';
import { ClientManager } from '../components/ClientManager';
import { Toast } from '../components/Toast';
import { Client, Order, CatalogData } from '../types';

export default function Home() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<{ userId: string; username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Active dashboard tab
  const [activeTab, setActiveTab] = useState<'bookings' | 'catalogs' | 'clients'>('bookings');

  // Authentication credentials states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // App core states
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogs, setCatalogs] = useState<CatalogData | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Debounce search input to prevent SQL hammering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modals & Drawer control states
  const [showWizard, setShowWizard] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [wizardEditOrder, setWizardEditOrder] = useState<Order | null>(null);

  // Global toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setMounted(true);
    checkSession();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [darkMode, mounted]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        fetchClients();
        fetchCatalogs(activeTab === 'catalogs');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const url = `/api/orders?page=${currentPage}&limit=${limit}&status=${statusFilter}&search=${encodeURIComponent(debouncedSearchQuery)}&month=${monthFilter}&year=${yearFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCatalogs = async (includeInactive = false) => {
    try {
      const res = await fetch(`/api/catalogs${includeInactive ? '?all=true' : ''}`);
      const data = await res.json();
      if (data.success) {
        setCatalogs(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [currentPage, statusFilter, monthFilter, yearFilter, debouncedSearchQuery, user]);

  useEffect(() => {
    if (user) {
      fetchCatalogs(activeTab === 'catalogs');
    }
  }, [activeTab, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        setUsernameInput('');
        setPasswordInput('');
        fetchClients();
        fetchCatalogs(activeTab === 'catalogs');
      } else {
        setLoginError(data.error?.message || 'Login failed.');
      }
    } catch (e) {
      setLoginError('Could not connect to authentication services.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      setOrders([]);
      setClients([]);
      setCatalogs(null);
      setActiveTab('bookings');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleDownloadInvoice = (orderId: string) => {
    window.open(`/api/orders/${orderId}/pdf`, '_blank');
  };

  const handleDownloadReport = () => {
    const url = `/api/orders/report-pdf?page=${currentPage}&limit=${limit}&status=${statusFilter}&search=${encodeURIComponent(debouncedSearchQuery)}&month=${monthFilter}&year=${yearFilter}`;
    window.open(url, '_blank');
  };

  const handleActionSuccess = async () => {
    fetchOrders();
    if (selectedOrder) {
      const res = await fetch(`/api/orders/${selectedOrder.id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
      }
    }
  };

  const handleWizardSuccess = (updatedOrderId: string | null) => {
    fetchOrders();
    showToast(updatedOrderId ? 'Booking updated successfully.' : 'Booking created successfully.', 'success');
    if (updatedOrderId && selectedOrder && selectedOrder.id === updatedOrderId) {
      handleActionSuccess();
    }
  };

  const openWizardForCreate = () => {
    setWizardEditOrder(null);
    setShowWizard(true);
  };

  const openWizardForEdit = (order: Order) => {
    setWizardEditOrder(order);
    setShowWizard(true);
  };



  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
          <p className="font-semibold text-lg text-slate-900">Loading CPM monitoring console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'dark' : ''} scroll-smooth`}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">

        {/* NAVIGATION HEADER */}
        <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-3">
                <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center">
                  CPM Order Monitoring System
                </span>
                {user && (
                  <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full font-mono font-semibold uppercase">
                    {user.role}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Toggle Theme"
                >
                  {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>

                {user ? (
                  <div className="flex items-center space-x-4 pl-4 border-l border-slate-200 dark:border-slate-800">
                    <span className="hidden sm:inline text-sm font-medium text-slate-600 dark:text-slate-300">
                      Welcome, <strong className="text-slate-900 dark:text-white">{user.username}</strong>
                    </span>
                    <button
                      onClick={handleLogout}
                      className="flex items-center text-xs text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-lg transition-all"
                    >
                      <LogOut className="w-4 h-4 mr-1" /> Log Out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN BODY AREA */}
        {!user ? (
          /* LOGIN COMPONENT VIEW */
          <main className="max-w-md mx-auto px-4 py-24">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Login
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  CPM Order Audit Console
                </p>
              </div>

              {loginError && (
                <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 p-4 rounded-xl border border-rose-200 dark:border-rose-800 text-sm mb-6 flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Username</label>
                  <input
                    type="text"
                    id="username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    id="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors outline-none"
                    placeholder="Enter password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center"
                >
                  Access Console <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </form>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Development Test Accounts:</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div
                      onClick={() => { setUsernameInput('user'); setPasswordInput('user123'); }}
                      className="bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
                    >
                      <p className="font-bold text-blue-600 dark:text-sky-400">Staff User</p>
                      <p className="text-slate-500 mt-1 font-mono">user / user123</p>
                    </div>
                    <div
                      onClick={() => { setUsernameInput('admin'); setPasswordInput('admin123'); }}
                      className="bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
                    >
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">Admin Lead</p>
                      <p className="text-slate-500 mt-1 font-mono">admin / admin123</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          /* LOGGED IN VIEW */
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

            {/* Console Tabs */}
            <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'bookings'
                    ? 'border-blue-600 text-blue-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Bookings Console
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'clients'
                    ? 'border-blue-600 text-blue-600 dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Customer Directory
              </button>
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => setActiveTab('catalogs')}
                  className={`py-3 px-6 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'catalogs'
                      ? 'border-blue-600 text-blue-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Operational Catalogs
                </button>
              )}
            </div>

            {activeTab === 'bookings' && (
              <>
                {/* KPI STAT CARDS */}
                <KpiCards orders={orders} />

                {/* BUTTON BAR & SEARCH */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-6 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:space-x-4">
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                    {/* Search field */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by client name, venue, or order ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    {/* Filter list */}
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={handleStatusFilterChange}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="PAID">PAID</option>
                        <option value="FOR_UPDATE">FOR UPDATE</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>

                      <select
                        value={monthFilter}
                        onChange={(e) => {
                          setMonthFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="ALL">All Months</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>

                      <select
                        value={yearFilter}
                        onChange={(e) => {
                          setYearFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="ALL">All Years</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleDownloadReport}
                      className="bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center"
                    >
                      <FileDown className="w-4 h-4 mr-2" /> Download Report
                    </button>
                    <button
                      onClick={() => setShowClientModal(true)}
                      className="bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center"
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Register Client
                    </button>
                    <button
                      onClick={openWizardForCreate}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-md hover:-translate-y-0.5 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" /> New Booking
                    </button>
                  </div>
                </div>

                {/* LIST OF BOOKINGS TABLE */}
                <OrdersTable
                  orders={orders}
                  onSelectOrder={(order) => router.push(`/orders/${order.id}`)}
                  onDownloadInvoice={handleDownloadInvoice}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  limit={limit}
                  onPageChange={setCurrentPage}
                />
              </>
            )}

            {activeTab === 'clients' && (
              <ClientManager
                clients={clients}
                catalogs={catalogs}
                onRefresh={fetchClients}
                showToast={showToast}
              />
            )}

            {activeTab === 'catalogs' && user.role === 'ADMIN' && (
              <CatalogManager
                catalogs={catalogs}
                onRefresh={() => fetchCatalogs(true)}
                showToast={showToast}
              />
            )}

          </main>
        )}

        {/* MODAL 1: REGISTER NEW CLIENT */}
        {showClientModal && (
          <RegisterClientModal
            onClose={() => setShowClientModal(false)}
            onSuccess={fetchClients}
            catalogs={catalogs}
          />
        )}

        {/* MODAL 2: BOOKING WIZARD */}
        {showWizard && (
          <BookingWizardModal
            onClose={() => setShowWizard(false)}
            onSuccess={handleWizardSuccess}
            catalogs={catalogs}
            clients={clients}
            editOrder={wizardEditOrder}
            user={user}
          />
        )}

        {/* DETAILS DRAWER: BOOKING VIEW & AUDIT TRAIL */}
        {selectedOrder && (
          <OrderDetailDrawer
            selectedOrder={selectedOrder}
            user={user}
            onClose={() => setSelectedOrder(null)}
            onEdit={openWizardForEdit}
            onActionSuccess={handleActionSuccess}
            showToast={showToast}
          />
        )}

      </div>

      {/* GLOBAL TOAST NOTIFICATION */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}
