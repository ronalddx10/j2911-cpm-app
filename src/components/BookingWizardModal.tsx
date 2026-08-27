import React, { useState, useEffect } from 'react';
import { CalendarClock, X, ChevronRight, AlertCircle, ArrowLeft, Plus, CheckCircle2, RefreshCw } from 'lucide-react';
import { CatalogData, Client, Order } from '../types';

interface BookingWizardModalProps {
  onClose: () => void;
  onSuccess: (updatedOrderId: string | null) => void;
  catalogs: CatalogData | null;
  clients: Client[];
  editOrder?: Order | null;
  user?: { userId: string; username: string; role: string } | null;
}

export const BookingWizardModal: React.FC<BookingWizardModalProps> = ({
  onClose,
  onSuccess,
  catalogs,
  clients,
  editOrder,
  user,
}) => {
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardClientId, setWizardClientId] = useState('');
  const [wizardVenueId, setWizardVenueId] = useState('');
  const [wizardVenueName, setWizardVenueName] = useState('');
  const [wizardEventName, setWizardEventName] = useState('');
  const [wizardUnitNumber, setWizardUnitNumber] = useState('');
  const [wizardFloorNumber, setWizardFloorNumber] = useState('');
  const [wizardBuildingName, setWizardBuildingName] = useState('');
  const [wizardStreetNumber, setWizardStreetNumber] = useState('');
  const [wizardStreetName, setWizardStreetName] = useState('');
  const [wizardLandmark, setWizardLandmark] = useState('');
  const [wizardCustomAddress, setWizardCustomAddress] = useState('');
  const [wizardServiceTypeId, setWizardServiceTypeId] = useState('');
  const [wizardPax, setWizardPax] = useState<number | ''>(10);
  const [wizardIngressTime, setWizardIngressTime] = useState('08:00');
  const [wizardEgressTime, setWizardEgressTime] = useState('17:00');
  const [wizardInstructions, setWizardInstructions] = useState('');
  const [poFile, setPoFile] = useState<File | null>(null);
  const [wizardDays, setWizardDays] = useState<Array<{
    tempId: string;
    eventDate: string;
    mealPeriods: Array<{ tempId: string; menuId: string; mealPeriod: string; pax: number; rate: number | string; customName: string; itemIds: string[]; serviceTime?: string | null }>;
  }>>([]);
  const [wizardError, setWizardError] = useState('');
  const [foodItems, setFoodItems] = useState<Array<{ id: string, itemName: string, category: string, unitPrice: string }>>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedServiceType = catalogs?.serviceTypes.find(st => st.id.toString() === wizardServiceTypeId);
  const isCatering = selectedServiceType?.serviceName.toLowerCase().includes('catering') || false;

  // Computed address string
  const computedAddressPreview = [
    wizardUnitNumber ? `Unit ${wizardUnitNumber}` : null,
    wizardFloorNumber ? `${wizardFloorNumber} Floor` : null,
    wizardBuildingName || null,
    wizardStreetNumber && wizardStreetName ? `${wizardStreetNumber} ${wizardStreetName}` : (wizardStreetName || wizardStreetNumber || null),
    wizardLandmark ? `(Landmark: ${wizardLandmark})` : null,
  ].filter(Boolean).join(', ');

  // Draft form states for meal period entry
  const [draftMealPeriod, setDraftMealPeriod] = useState('Breakfast');
  const [draftMenuId, setDraftMenuId] = useState('');
  const [draftCustomName, setDraftCustomName] = useState('');
  const [draftRate, setDraftRate] = useState<string>('');
  const [draftPax, setDraftPax] = useState<number>(Number(wizardPax) || 10);
  const [draftItemIds, setDraftItemIds] = useState<string[]>([]);
  const [draftServiceTime, setDraftServiceTime] = useState<string>('');
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [editingMealIndex, setEditingMealIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/catalogs/items')
      .then(res => res.json())
      .then(data => {
        if (data.success) setFoodItems(data.data);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (editOrder) {
      setWizardClientId(editOrder.clientId);
      setWizardVenueId(editOrder.venueId || '');
      setWizardVenueName(editOrder.venue?.venueName || '');
      setWizardEventName(editOrder.eventName || '');
      setWizardUnitNumber(editOrder.unitNumber || '');
      setWizardFloorNumber(editOrder.floorNumber || '');
      setWizardBuildingName(editOrder.buildingName || '');
      setWizardStreetNumber(editOrder.streetNumber || '');
      setWizardStreetName(editOrder.streetName || '');
      setWizardLandmark(editOrder.landmark || '');
      setWizardCustomAddress(editOrder.venue ? editOrder.venue.physicalAddress : (editOrder.customDeliveryAddress || ''));
      setWizardServiceTypeId(editOrder.serviceTypeId);
      setWizardPax(editOrder.pax || 10); // Set global pax
      setPoFile(null);

      const formatTime = (timeVal: any) => {
        if (!timeVal) return '';
        if (typeof timeVal === 'string' && timeVal.includes(':')) {
          const parts = timeVal.split(':');
          return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
        }
        return '';
      };

      setWizardIngressTime(formatTime(editOrder.ingressTime));
      setWizardEgressTime(formatTime(editOrder.egressTime));
      setWizardInstructions(editOrder.specialInstructions || '');

      const days = editOrder.orderDays.map((day: any) => ({
        tempId: Math.random().toString(),
        eventDate: day.eventDate.split('T')[0],
        mealPeriods: day.mealPeriods.map((meal: any) => ({
          tempId: Math.random().toString(),
          menuId: meal.menuId || '',
          mealPeriod: meal.mealPeriod || 'Breakfast',
          pax: meal.pax,
          rate: Number(meal.rate || 0),
          customName: meal.customName || '',
          serviceTime: meal.serviceTime?.substring(0, 5) || null,
          itemIds: meal.mealPeriodItems ? meal.mealPeriodItems.map((mpi: any) => mpi.itemId) : []
        })),
      }));
      setWizardDays(days);
    } else {
      // Defaults for create
      setWizardClientId('');
      setWizardVenueId('');
      setWizardVenueName('');
      setWizardEventName('');
      setWizardUnitNumber('');
      setWizardFloorNumber('');
      setWizardBuildingName('');
      setWizardStreetNumber('');
      setWizardStreetName('');
      setWizardLandmark('');
      setWizardCustomAddress('');
      setWizardServiceTypeId('');
      setWizardPax(10); // Reset global pax
      setWizardIngressTime('08:00');
      setWizardEgressTime('17:00');
      setWizardInstructions('');
      setPoFile(null);
      setWizardDays([
        {
          tempId: Math.random().toString(),
          eventDate: new Date().toISOString().split('T')[0],
          mealPeriods: []
        }
      ]);
      setEditingDayIndex(0); // Open form for the first day by default
    }
  }, [editOrder]);

  const addWizardDay = () => {
    setWizardDays([
      ...wizardDays,
      {
        tempId: Math.random().toString(),
        eventDate: new Date().toISOString().split('T')[0],
        mealPeriods: [{ tempId: Math.random().toString(), mealPeriod: 'Lunch', menuId: '', pax: Number(wizardPax) || 10, rate: 0, customName: '', itemIds: [] }]
      }
    ]);
  };

  const addMealPeriod = (dayIndex: number) => {
    const updated = [...wizardDays];
    updated[dayIndex].mealPeriods.push({
      tempId: Math.random().toString(),
      mealPeriod: 'Lunch',
      menuId: '',
      pax: Number(wizardPax) || 10,
      rate: 0,
      customName: '',
      itemIds: []
    });
    setWizardDays(updated);
  };

  const removeWizardDay = (dayIndex: number) => {
    if (wizardDays.length <= 1) return;
    setWizardDays(wizardDays.filter((_, idx) => idx !== dayIndex));
    if (editingDayIndex === dayIndex) {
      resetDraftForm();
    } else if (editingDayIndex !== null && editingDayIndex > dayIndex) {
      setEditingDayIndex(editingDayIndex - 1);
    }
  };

  const updateDayDate = (dayIndex: number, eventDate: string) => {
    const updated = [...wizardDays];
    updated[dayIndex].eventDate = eventDate;
    setWizardDays(updated);
  };

  const removeMealPeriod = (dayIndex: number, mealIndex: number) => {
    const updated = [...wizardDays];
    updated[dayIndex].mealPeriods = updated[dayIndex].mealPeriods.filter((_, idx) => idx !== mealIndex);
    setWizardDays(updated);
    if (editingDayIndex === dayIndex && editingMealIndex === mealIndex) {
      resetDraftForm();
    } else if (editingDayIndex === dayIndex && editingMealIndex !== null && editingMealIndex > mealIndex) {
      setEditingMealIndex(editingMealIndex - 1);
    }
  };

  const calculateWizardTotal = () => {
    let total = 0;
    wizardDays.forEach((day) => {
      day.mealPeriods.forEach((meal) => {
        total += Number(meal.rate) * Number(meal.pax);
      });
    });
    return total;
  };

  // Step 2 & 3: Draft Form Handlers
  const getFilteredMenus = (mealPeriod: string) => {
    if (!catalogs?.menus) return [];
    const normPeriod = mealPeriod.toLowerCase();
    
    return catalogs.menus.filter(menu => {
      // 1. If it's a standard empty package, match by title keyword
      if (!menu.menuItems || menu.menuItems.length === 0) {
        if (normPeriod === 'breakfast' && menu.title.toLowerCase().includes('breakfast')) return true;
        if (normPeriod === 'am snack' && (menu.title.toLowerCase().includes('am snack') || menu.title.toLowerCase().includes('morning snack'))) return true;
        if (normPeriod === 'pm snack' && (menu.title.toLowerCase().includes('pm snack') || menu.title.toLowerCase().includes('afternoon snack'))) return true;
        if (normPeriod === 'lunch' && menu.title.toLowerCase().includes('lunch')) return true;
        if (normPeriod === 'dinner' && menu.title.toLowerCase().includes('dinner')) return true;
        return false;
      }
      
      // 2. Match by linked item category
      return menu.menuItems.some(mi => {
        const cat = (mi.item?.category || '').toUpperCase();
        if (normPeriod === 'breakfast') return cat === 'BREAKFAST';
        if (normPeriod === 'am snack' || normPeriod === 'pm snack') {
          return cat === 'SNACK' || cat === 'DESSERT' || cat === 'DRINKS';
        }
        if (normPeriod === 'lunch' || normPeriod === 'dinner') {
          return cat === 'LUNCH_DINNER' || cat === 'APPETIZER' || cat === 'SOUP';
        }
        return false;
      });
    });
  };

  const resetDraftForm = () => {
    setDraftMealPeriod('Breakfast');
    setDraftMenuId('');
    setDraftCustomName('');
    setDraftRate('');
    setDraftPax(Number(wizardPax) || 10);
    setDraftItemIds([]);
    setDraftServiceTime('07:00');
    setEditingDayIndex(null);
    setEditingMealIndex(null);
  };

  const getFilteredFoodItems = () => {
    const normPeriod = draftMealPeriod.toLowerCase();
    return foodItems.filter(fi => {
      const cat = (fi.category || '').toUpperCase();
      if (normPeriod === 'breakfast') {
        return cat === 'BREAKFAST' || cat === 'DRINKS' || cat === 'DESSERT';
      }
      if (normPeriod === 'lunch' || normPeriod === 'dinner') {
        return cat === 'LUNCH_DINNER' || cat === 'APPETIZER' || cat === 'DESSERT' || cat === 'DRINKS' || cat === 'SOUP';
      }
      if (normPeriod === 'am snack' || normPeriod === 'pm snack') {
        return cat === 'SNACK' || cat === 'DRINKS';
      }
      if (normPeriod === 'extra' || normPeriod === 'extras') {
        return cat === 'EXTRA';
      }
      return true;
    });
  };

  const saveLineItem = (dayIndex: number) => {
    if (!draftMenuId && (!draftCustomName || draftCustomName.trim() === '')) {
      setWizardError('Please select a menu or enter a custom package name.');
      return;
    }
    setWizardError('');
    const updated = [...wizardDays];
    const newMeal = {
      tempId: editingMealIndex !== null ? updated[dayIndex].mealPeriods[editingMealIndex].tempId : Math.random().toString(),
      menuId: draftMenuId || null,
      mealPeriod: draftMealPeriod,
      pax: Number(draftPax) || 1,
      rate: String(draftRate || 0),
      customName: draftCustomName || null,
      serviceTime: draftServiceTime || null,
      itemIds: draftItemIds,
    };

    if (editingMealIndex !== null && editingDayIndex === dayIndex) {
      updated[dayIndex].mealPeriods[editingMealIndex] = newMeal as any;
    } else {
      updated[dayIndex].mealPeriods.push(newMeal as any);
    }
    setWizardDays(updated);
    resetDraftForm();
  };

  const editLineItem = (dayIndex: number, mealIndex: number) => {
    const meal = wizardDays[dayIndex].mealPeriods[mealIndex];
    setEditingDayIndex(dayIndex);
    setEditingMealIndex(mealIndex);
    setDraftMealPeriod(meal.mealPeriod);
    setDraftMenuId(meal.menuId || '');
    setDraftCustomName(meal.customName || '');
    setDraftRate(String(meal.rate));
    setDraftPax(meal.pax);
    setDraftItemIds(meal.itemIds || []);
    setDraftServiceTime(meal.serviceTime || '');
    setWizardError('');
  };

  const handleDraftMenuChange = (val: string) => {
    if (val === '') {
      setDraftMenuId('');
      setDraftRate('0');
      setDraftItemIds([]);
    } else {
      const menu = catalogs?.menus.find(m => m.id === val);
      if (menu) {
        setDraftMenuId(val);
        setDraftRate(String(menu.baseRate));
        setDraftItemIds(menu.menuItems.map(mi => mi.itemId));
      }
    }
  };

  const handleDraftMealPeriodChange = (val: string) => {
    setDraftMealPeriod(val);
    setDraftMenuId(''); // Clear menu when changing period to ensure validity
    setDraftRate('0');
    setDraftItemIds([]);

    const defaultServiceTimes: Record<string, string> = {
      'Breakfast': '07:00',
      'AM Snack': '10:00',
      'Lunch': '11:00',
      'PM Snack': '14:30',
      'Dinner': '17:30',
    };
    setDraftServiceTime(defaultServiceTimes[val] || '');
  };

  const handleWizardSubmit = async (targetStatus: 'DRAFT' | 'APPROVED' | 'PENDING_APPROVAL' = 'DRAFT') => {
    setWizardError('');

    if (!wizardClientId || !wizardServiceTypeId) {
      setWizardError('Please select a client and service type.');
      return;
    }

    if (isCatering && (!wizardEventName || wizardEventName.trim() === '')) {
      setWizardError('Event name is required for catering bookings.');
      return;
    }

    if (!wizardPax || Number(wizardPax) <= 0) {
      setWizardError('Number of pax must be greater than zero.');
      return;
    }

    if (!wizardVenueId && !computedAddressPreview && (!wizardCustomAddress || wizardCustomAddress.trim() === '')) {
      setWizardError('Please specify a delivery address.');
      return;
    }

    for (const day of wizardDays) {
      if (!day.eventDate) {
        setWizardError('All days must have a date specified.');
        return;
      }
      if (day.mealPeriods.length === 0) {
        setWizardError('Every day must have at least one meal period.');
        return;
      }
      for (const meal of day.mealPeriods) {
        if (!meal.menuId && !meal.customName) {
          setWizardError('All meal periods must select a menu or have a custom name.');
          return;
        }
        if (meal.pax <= 0) {
          setWizardError('Pax must be greater than 0.');
          return;
        }
      }
    }

    const payload = {
      clientId: wizardClientId,
      venueId: wizardVenueId ? wizardVenueId : null,
      venueName: wizardVenueName || null,
      eventName: isCatering ? wizardEventName || null : null,
      unitNumber: wizardUnitNumber || null,
      floorNumber: wizardFloorNumber || null,
      buildingName: wizardBuildingName || null,
      streetNumber: wizardStreetNumber || null,
      streetName: wizardStreetName || null,
      landmark: wizardLandmark || null,
      customDeliveryAddress: wizardVenueId ? null : (computedAddressPreview || wizardCustomAddress),
      serviceTypeId: wizardServiceTypeId,
      pax: Number(wizardPax),
      ingressTime: isCatering ? (wizardIngressTime || null) : null,
      egressTime: isCatering ? (wizardEgressTime || null) : null,
      specialInstructions: wizardInstructions,
      initialStatus: targetStatus,
      orderDays: wizardDays.map((d) => ({
        eventDate: d.eventDate,
        mealPeriods: d.mealPeriods.map((m) => ({
          menuId: m.menuId || null,
          mealPeriod: m.mealPeriod,
          pax: m.pax,
          rate: m.rate,
          customName: m.customName,
          serviceTime: m.serviceTime,
          itemIds: m.itemIds,
        })),
      })),
    };

    setActionLoading(true);
    try {
      const url = editOrder ? `/api/orders/${editOrder.id}` : '/api/orders';
      const method = editOrder ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const orderId = editOrder ? editOrder.id : data.data.id;

        // If PO file was selected, upload it immediately
        if (poFile && orderId) {
          try {
            const formData = new FormData();
            formData.append('file', poFile);
            formData.append('documentType', 'PURCHASE_ORDER');

            await fetch(`/api/orders/${orderId}/attachments`, {
              method: 'POST',
              body: formData,
            });
          } catch (fileErr) {
            console.error('Failed to upload PO attachment during creation:', fileErr);
          }
        }

        onSuccess(orderId);
        onClose();
      } else {
        setWizardError(data.error?.message || 'Failed to save booking.');
      }
    } catch (e) {
      setWizardError('An error occurred while saving the order.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
              <CalendarClock className="w-5 h-5 mr-2 text-blue-600 dark:text-sky-400" />
              {editOrder ? 'Modify Catering Booking' : 'Launch New Catering Booking Wizard'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">Catering & Packed Meals (CPM) Operational Wizard</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center space-x-8">
          <span className={`text-sm font-bold flex items-center ${wizardStep === 1 ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono mr-2 ${wizardStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>1</span>
            Basic Order Details
          </span>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <span className={`text-sm font-bold flex items-center ${wizardStep === 2 ? 'text-blue-600 dark:text-sky-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono mr-2 ${wizardStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>2</span>
            Multi-Day Meal Schedule
          </span>
        </div>

        {/* Error Warning */}
        {wizardError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span>{wizardError}</span>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {wizardStep === 1 ? (
            /* STEP 1: INFO */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="wizardClient" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Select Client / Profile</label>
                  <select
                    id="wizardClient"
                    value={wizardClientId}
                    onChange={(e) => setWizardClientId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Choose Profile --</option>
                    {clients.map((c) => {
                      const name = c.clientType !== 'INDIVIDUAL'
                        ? c.organizationName || `${c.firstName} ${c.lastName}`
                        : `${c.firstName} ${c.lastName}`;
                      return <option key={c.id} value={c.id}>{name} ({c.clientType})</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="wizardService" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Service Type</label>
                  <select
                    id="wizardService"
                    value={wizardServiceTypeId}
                    onChange={(e) => setWizardServiceTypeId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Choose Service Type --</option>
                    {catalogs?.serviceTypes.map((st) => (
                      <option key={st.id} value={st.id}>{st.serviceName}</option>
                    ))}
                  </select>
                </div>

                {isCatering && (
                  <div className="md:col-span-2">
                    <label htmlFor="wizardEventName" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Event Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="wizardEventName"
                      value={wizardEventName}
                      onChange={(e) => setWizardEventName(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                      placeholder="e.g. Annual Shareholders Meeting, Year-End Gala"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="wizardPaxInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Number of Pax</label>
                  <input
                    type="number"
                    id="wizardPaxInput"
                    value={wizardPax}
                    onChange={(e) => setWizardPax(e.target.value === '' ? '' : parseInt(e.target.value))}
                    min={1}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="wizardVenueInput" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Event Venue (Optional Pre-set)</label>
                  <input
                    id="wizardVenueInput"
                    list="wizard-venues-datalist"
                    value={wizardVenueName}
                    onChange={(e) => {
                      const typedVal = e.target.value;
                      setWizardVenueName(typedVal);
                      const matchingVenue = catalogs?.venues.find(v => v.venueName.toLowerCase() === typedVal.toLowerCase());
                      if (matchingVenue) {
                        setWizardVenueId(matchingVenue.id);
                        setWizardCustomAddress(matchingVenue.physicalAddress);
                      } else {
                        setWizardVenueId('');
                      }
                    }}
                    placeholder="Type to search pre-set venue or leave blank..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none font-sans"
                  />
                  <datalist id="wizard-venues-datalist">
                    {catalogs?.venues.map((v) => (
                      <option key={v.id} value={v.venueName} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Delivery Address Breakdown */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {wizardVenueId ? "Pre-set Venue Physical Address" : "Delivery Address Details"}
                  </span>
                  {computedAddressPreview && !wizardVenueId && (
                    <span className="text-xs text-blue-600 dark:text-sky-400 font-medium truncate max-w-sm">
                      {computedAddressPreview}
                    </span>
                  )}
                </div>

                {wizardVenueId ? (
                  <div>
                    <input
                      type="text"
                      disabled
                      value={wizardCustomAddress}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-500 outline-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Number</label>
                        <input
                          type="text"
                          value={wizardUnitNumber}
                          onChange={(e) => setWizardUnitNumber(e.target.value)}
                          placeholder="e.g. Unit 402"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Floor Number</label>
                        <input
                          type="text"
                          value={wizardFloorNumber}
                          onChange={(e) => setWizardFloorNumber(e.target.value)}
                          placeholder="e.g. 4th Floor"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Building</label>
                        <input
                          type="text"
                          value={wizardBuildingName}
                          onChange={(e) => setWizardBuildingName(e.target.value)}
                          placeholder="e.g. One Corporate Center"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Street Number</label>
                        <input
                          type="text"
                          value={wizardStreetNumber}
                          onChange={(e) => setWizardStreetNumber(e.target.value)}
                          placeholder="e.g. #123"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Street Name</label>
                        <input
                          type="text"
                          value={wizardStreetName}
                          onChange={(e) => setWizardStreetName(e.target.value)}
                          placeholder="e.g. Meralco Avenue"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Landmark</label>
                        <input
                          type="text"
                          value={wizardLandmark}
                          onChange={(e) => setWizardLandmark(e.target.value)}
                          placeholder="e.g. Across Medical City"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase Order (PO) Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Attach Purchase Order (PO) <span className="text-slate-400 font-normal">(Optional reference)</span>
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    id="poFileInput"
                    onChange={(e) => setPoFile(e.target.files ? e.target.files[0] : null)}
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-300"
                  />
                  {poFile && (
                    <button
                      type="button"
                      onClick={() => setPoFile(null)}
                      className="text-xs text-rose-500 hover:underline flex-shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {isCatering && (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="ingress" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Ingress Time (24h format)</label>
                    <input
                      type="time"
                      id="ingress"
                      value={wizardIngressTime}
                      onChange={(e) => setWizardIngressTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="egress" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Egress Time (24h format)</label>
                    <input
                      type="time"
                      id="egress"
                      value={wizardEgressTime}
                      onChange={(e) => setWizardEgressTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="instructions" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Special Instructions / Remarks</label>
                <textarea
                  id="instructions"
                  rows={3}
                  value={wizardInstructions}
                  onChange={(e) => setWizardInstructions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none resize-none"
                  placeholder="Enter food allergies, server setup, or delivery directions..."
                />
              </div>
            </div>
          ) : (
            /* STEP 2: MULTI-DAY SCHEDULE */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Booking Days</span>
                <button
                  type="button"
                  onClick={addWizardDay}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Day
                </button>
              </div>

              <div className="space-y-6">
                {wizardDays.map((day, dIdx) => (
                  <div key={day.tempId} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 relative space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Day {dIdx + 1}:</span>
                        <input
                          type="date"
                          value={day.eventDate}
                          onChange={(e) => updateDayDate(dIdx, e.target.value)}
                          required
                          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingDayIndex !== dIdx && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                resetDraftForm();
                                setEditingDayIndex(dIdx);
                              }}
                              className="py-1 px-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-sky-400 rounded-lg text-xs font-bold"
                            >
                              + Add Meal Period
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                resetDraftForm();
                                setDraftMealPeriod('Extra');
                                setDraftServiceTime('');
                                setEditingDayIndex(dIdx);
                              }}
                              className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 rounded-lg text-xs font-bold"
                            >
                              + Add Extras
                            </button>
                          </>
                        )}
                        {wizardDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWizardDay(dIdx)}
                            className="text-xs text-red-600 hover:text-red-800 font-semibold pl-2 border-l border-slate-200 dark:border-slate-800"
                          >
                            Remove Day
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meal periods summary table */}
                    {day.mealPeriods.length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            <tr>
                              <th className="px-4 py-2 font-semibold">Period</th>
                              <th className="px-4 py-2 font-semibold">Service Time</th>
                              <th className="px-4 py-2 font-semibold">Item</th>
                              <th className="px-4 py-2 font-semibold text-right">Rate</th>
                              <th className="px-4 py-2 font-semibold text-right">Pax</th>
                              <th className="px-4 py-2 font-semibold text-right">Subtotal</th>
                              <th className="px-4 py-2 font-semibold text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {day.mealPeriods.map((meal, mIdx) => {
                              const subtotal = Number(meal.rate) * meal.pax;
                              const selectedMenu = catalogs?.menus.find(m => m.id === meal.menuId);
                              const itemName = meal.customName || selectedMenu?.title || 'Custom Package';
                              return (
                                <tr key={meal.tempId} className={editingDayIndex === dIdx && editingMealIndex === mIdx ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.mealPeriod}</td>
                                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{meal.serviceTime || '—'}</td>
                                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{itemName}</td>
                                  <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">₱{Number(meal.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">{meal.pax}</td>
                                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => editLineItem(dIdx, mIdx)}
                                      className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-semibold disabled:opacity-50"
                                      disabled={editingDayIndex === dIdx && editingMealIndex === mIdx}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeMealPeriod(dIdx, mIdx)}
                                      className="text-red-600 hover:text-red-800 text-xs font-semibold"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Add/Edit Form Area */}
                    {editingDayIndex === dIdx && (
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800/50 shadow-sm space-y-4">
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                          {editingMealIndex !== null ? 'Edit Line Item' : 'Add Line Item'}
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-start md:items-center space-y-3 md:space-y-0 md:space-x-3">
                          {/* Meal Period Dropdown */}
                          {draftMealPeriod !== 'Extra' && (
                            <div className="w-full md:w-36">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Period</label>
                              <select
                                value={draftMealPeriod}
                                onChange={(e) => handleDraftMealPeriodChange(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                              >
                                <option value="Breakfast">Breakfast</option>
                                <option value="AM Snack">AM Snack</option>
                                <option value="Lunch">Lunch</option>
                                <option value="PM Snack">PM Snack</option>
                                <option value="Dinner">Dinner</option>
                              </select>
                            </div>
                          )}

                          {/* Service Time */}
                          {draftMealPeriod !== 'Extra' && (
                            <div className="w-full md:w-32">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Service Time</label>
                              <input
                                type="time"
                                value={draftServiceTime}
                                onChange={(e) => setDraftServiceTime(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                              />
                            </div>
                          )}

                          {/* Menu Package Dropdown (Filtered) */}
                          {draftMealPeriod !== 'Extra' && (
                            <div className="flex-1 w-full">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Package / Menu</label>
                              <select
                                value={draftMenuId}
                                onChange={(e) => handleDraftMenuChange(e.target.value)}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                              >
                                <option value="">-- Build Dynamic Group --</option>
                                {getFilteredMenus(draftMealPeriod).map((m) => (
                                  <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Price per Pax */}
                          <div className="w-full md:w-28">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Rate / Pax</label>
                            <input
                              type="number"
                              value={draftRate}
                              onChange={(e) => setDraftRate(e.target.value)}
                              min={0}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                            />
                          </div>

                          {/* Pax Count */}
                          <div className="w-full md:w-24">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Pax</label>
                            <input
                              type="number"
                              value={draftPax}
                              onChange={(e) => setDraftPax(parseInt(e.target.value) || 0)}
                              required
                              min={1}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* Custom Name Field */}
                        {(!draftMenuId || (draftMenuId && draftItemIds.sort().join(',') !== (catalogs?.menus.find(m => m.id === draftMenuId)?.menuItems.map(mi => mi.itemId).sort().join(',') || ''))) && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Custom Package Name *</label>
                            <input
                              type="text"
                              value={draftCustomName}
                              onChange={(e) => setDraftCustomName(e.target.value)}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                              placeholder="e.g. Special VIP Lunch"
                            />
                          </div>
                        )}

                        {/* Food Item Checklist Drawer */}
                        <div className="pt-2">
                          <details className="group border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950/50">
                            <summary className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer list-none flex justify-between items-center outline-none">
                              <span>Selected Food Items ({draftItemIds.length})</span>
                              <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                            </summary>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {getFilteredFoodItems().map(fi => (
                                  <label key={fi.id} className="flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={draftItemIds.includes(fi.id)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        let newIds = [...draftItemIds];
                                        if (checked) {
                                          newIds.push(fi.id);
                                        } else {
                                          newIds = newIds.filter(id => id !== fi.id);
                                        }
                                        setDraftItemIds(newIds);

                                        if (draftMealPeriod === 'Extra') {
                                          if (newIds.length === 1) {
                                            const singleItem = foodItems.find(item => item.id === newIds[0]);
                                            if (singleItem) {
                                              setDraftCustomName(singleItem.itemName);
                                              setDraftRate(String(singleItem.unitPrice));
                                            }
                                          } else if (newIds.length > 1) {
                                            const selectedItems = foodItems.filter(item => newIds.includes(item.id));
                                            setDraftCustomName(selectedItems.map(item => item.itemName).join(' + '));
                                            const sumRate = selectedItems.reduce((sum, item) => sum + Number(item.unitPrice), 0);
                                            setDraftRate(String(sumRate));
                                          } else {
                                            setDraftCustomName('');
                                            setDraftRate('');
                                          }
                                        }
                                      }}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate" title={fi.itemName}>{fi.itemName}</span>
                                  </label>
                                ))}
                                {getFilteredFoodItems().length === 0 && (
                                  <div className="text-xs text-slate-500 italic col-span-full">No food items available for this period.</div>
                                )}
                              </div>
                            </div>
                          </details>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={resetDraftForm}
                            className="py-1.5 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveLineItem(dIdx)}
                            className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow"
                          >
                            {editingMealIndex !== null ? 'Save Changes' : 'Add Item'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Booking Cost Estimation:</p>
                  <p className="text-2xl font-extrabold text-blue-600 dark:text-sky-400 mt-1">PHP {calculateWizardTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between">
          <div>
            {wizardStep === 2 && (
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            {wizardStep === 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow flex items-center"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            ) : editOrder ? (
              <button
                type="button"
                onClick={() => handleWizardSubmit('DRAFT')}
                disabled={actionLoading || editingDayIndex !== null}
                className={`py-2 px-5 rounded-lg text-sm font-bold shadow flex items-center transition-all ${actionLoading || editingDayIndex !== null ? 'bg-slate-400 cursor-not-allowed text-slate-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                title={editingDayIndex !== null ? "Save your draft line item first" : ""}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Save Revisions
              </button>
            ) : user?.role === 'ADMIN' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleWizardSubmit('DRAFT')}
                  disabled={actionLoading || editingDayIndex !== null}
                  className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleWizardSubmit('APPROVED')}
                  disabled={actionLoading || editingDayIndex !== null}
                  className={`py-2 px-5 rounded-lg text-sm font-bold shadow flex items-center transition-all ${actionLoading || editingDayIndex !== null ? 'bg-slate-400 cursor-not-allowed text-slate-100' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                  title={editingDayIndex !== null ? "Save your draft line item first" : ""}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Submit & Approve
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleWizardSubmit('DRAFT')}
                  disabled={actionLoading || editingDayIndex !== null}
                  className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleWizardSubmit('PENDING_APPROVAL')}
                  disabled={actionLoading || editingDayIndex !== null}
                  className={`py-2 px-5 rounded-lg text-sm font-bold shadow flex items-center transition-all ${actionLoading || editingDayIndex !== null ? 'bg-slate-400 cursor-not-allowed text-slate-100' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                  title={editingDayIndex !== null ? "Save your draft line item first" : ""}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Submit Request
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
