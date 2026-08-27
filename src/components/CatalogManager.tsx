import React, { useState, useEffect } from 'react';
import { Plus, Check, X, ShieldAlert, Sparkles, Utensils, MapPin, ListPlus, Edit, Power, RefreshCw, FileDown } from 'lucide-react';
import { CatalogData, Venue, MenuCatalog, ServiceType } from '../types';

interface CatalogManagerProps {
  catalogs: CatalogData | null;
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const CatalogManager: React.FC<CatalogManagerProps> = ({
  catalogs,
  onRefresh,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'menus' | 'venues' | 'items'>('menus');
  const [loading, setLoading] = useState(false);

  // Lists for dropdown selectors
  const [allItems, setAllItems] = useState<any[]>([]);

  // Creation form overlays
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // Edit states
  const [editMenu, setEditMenu] = useState<MenuCatalog | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [showEditItemModal, setShowEditItemModal] = useState(false);

  // Form states
  const [menuTitle, setMenuTitle] = useState('');
  const [menuDesc, setMenuDesc] = useState('');
  const [menuRate, setMenuRate] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('');
  const [venueAddress, setVenueAddress] = useState('');

  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState('BREAKFAST');
  const [itemUnitPrice, setItemUnitPrice] = useState('');

  // Edit item form states
  const [editItemName, setEditItemName] = useState('');
  const [editItemCategory, setEditItemCategory] = useState('BREAKFAST');
  const [editItemUnitPrice, setEditItemUnitPrice] = useState('');

  const categories = [
    { value: 'BREAKFAST', label: 'Breakfast' },
    { value: 'SNACK', label: 'Snack' },
    { value: 'LUNCH_DINNER', label: 'Lunch/Dinner' },
    { value: 'APPETIZER', label: 'Appetizer' },
    { value: 'SOUP', label: 'Soup/Salad' },
    { value: 'DESSERT', label: 'Dessert' },
    { value: 'DRINKS', label: 'Drinks' },
  ];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/catalogs/items');
      const data = await res.json();
      if (data.success) {
        setAllItems(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/catalogs/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName,
          category: itemCategory,
          unitPrice: itemUnitPrice !== '' ? parseFloat(itemUnitPrice) : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Food item registered successfully.', 'success');
        setItemName('');
        setItemUnitPrice('');
        setShowItemModal(false);
        fetchItems();
        onRefresh();
      } else {
        showToast(data.error?.message || 'Failed to create item.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to services.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditItem = (item: any) => {
    setEditItem(item);
    setEditItemName(item.itemName);
    setEditItemCategory(item.category);
    setEditItemUnitPrice(item.unitPrice ?? '');
    setShowEditItemModal(true);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/catalogs/items/${editItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: editItemName,
          category: editItemCategory,
          unitPrice: editItemUnitPrice !== '' ? parseFloat(editItemUnitPrice) : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Menu item updated successfully.', 'success');
        setShowEditItemModal(false);
        setEditItem(null);
        fetchItems();
        onRefresh();
      } else {
        showToast(data.error?.message || 'Failed to update item.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to services.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/catalogs/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName,
          capacity: parseInt(venueCapacity),
          physicalAddress: venueAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Venue registered successfully.', 'success');
        setVenueName('');
        setVenueCapacity('');
        setVenueAddress('');
        setShowVenueModal(false);
        onRefresh();
      } else {
        showToast(data.error?.message || 'Failed to create venue.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to services.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateMenu = () => {
    setEditMenu(null);
    setMenuTitle('');
    setMenuDesc('');
    setMenuRate('');
    setSelectedItemIds([]);
    setShowMenuModal(true);
  };

  const openEditMenu = (menu: MenuCatalog) => {
    setEditMenu(menu);
    setMenuTitle(menu.title);
    setMenuDesc(menu.description || '');
    setMenuRate(menu.baseRate);
    setSelectedItemIds(menu.menuItems?.map(mi => String((mi.item as any).id)) || []);
    setShowMenuModal(true);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      title: menuTitle,
      description: menuDesc,
      baseRate: parseFloat(menuRate),
      itemIds: selectedItemIds,
    };

    try {
      const url = editMenu ? `/api/catalogs/menus/${editMenu.id}` : '/api/catalogs/menus';
      const method = editMenu ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(editMenu ? 'Menu package updated.' : 'Menu package created.', 'success');
        setShowMenuModal(false);
        onRefresh();
      } else {
        showToast(data.error?.message || 'Failed to save menu package.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to services.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuStatus = async (menu: MenuCatalog) => {
    try {
      const res = await fetch(`/api/catalogs/menus/${menu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !menu.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Menu status toggled to ${!menu.isActive ? 'Active' : 'Inactive'}.`, 'success');
        onRefresh();
      } else {
        showToast(data.error?.message || 'Failed to toggle status.', 'error');
      }
    } catch (err) {
      showToast('Error connecting to services.', 'error');
    }
  };

  const handleItemSelectToggle = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setSubTab('menus')}
          className={`py-2 px-5 text-sm font-semibold border-b-2 flex items-center transition-all ${
            subTab === 'menus'
              ? 'border-blue-600 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Utensils className="w-4 h-4 mr-2" /> Menu Packages
        </button>

        <button
          onClick={() => setSubTab('items')}
          className={`py-2 px-5 text-sm font-semibold border-b-2 flex items-center transition-all ${
            subTab === 'items'
              ? 'border-blue-600 text-blue-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListPlus className="w-4 h-4 mr-2" /> Menu Items
        </button>
      </div>

      {/* 1. MENUS TAB */}
      {subTab === 'menus' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Catering &amp; Packed Menu Catalog</h2>
              <p className="text-xs text-slate-500 mt-1">Manage active menu profiles, packages, and billing rates.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('/api/catalogs/menus/report-pdf', '_blank')}
                className="bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center"
              >
                <FileDown className="w-4 h-4 mr-2" /> Download Report
              </button>
              <button
                onClick={openCreateMenu}
                className="bg-blue-600 hover:bg-blue-750 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow transition-all flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Menu Package
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base Rate</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Linked Menu Item</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!catalogs?.menus || catalogs.menus.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No menu packages found. Click &quot;Create Menu Package&quot; to add one.
                    </td>
                  </tr>
                ) : (
                  catalogs.menus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-900 dark:text-white block">{menu.title}</span>
                        {menu.createdByName ? (
                          <span className="text-xs text-slate-400 block mt-0.5">Created by {menu.createdByName}</span>
                        ) : menu.createdByUserId ? (
                          <span className="text-xs text-slate-400 block mt-0.5">Created by user #{menu.createdByUserId}</span>
                        ) : null}
                        {menu.updatedByName ? (
                          <span className="text-xs text-slate-400 block">Updated by {menu.updatedByName}</span>
                        ) : menu.updatedByUserId ? (
                          <span className="text-xs text-slate-400 block">Updated by user #{menu.updatedByUserId}</span>
                        ) : null}
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-450 max-w-xs truncate">{menu.description || 'No description'}</td>
                      <td className="py-4 px-6 text-sm text-slate-900 dark:text-white font-bold">₱{Number(menu.baseRate).toFixed(2)}/pax</td>
                      <td className="py-4 px-6 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        {menu.menuItems && menu.menuItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {menu.menuItems.map((mi) => (
                              <span key={(mi.item as any).id} className="bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {(mi.item as any).itemName}
                              </span>
                            ))}
                          </div>
                        ) : 'No items linked'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          menu.isActive
                            ? 'bg-emerald-100 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : 'bg-slate-100 border-slate-250 text-slate-500 dark:bg-slate-800 dark:text-slate-450'
                        }`}>
                          {menu.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openEditMenu(menu)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-white"
                            title="Edit Package"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleMenuStatus(menu)}
                            className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${menu.isActive ? 'text-rose-500' : 'text-emerald-600'}`}
                            title={menu.isActive ? 'Deactivate Menu' : 'Activate Menu'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* 3. ITEMS TAB */}
      {subTab === 'items' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Menu Item Ledger</h2>
              <p className="text-xs text-slate-500 mt-1">Manage catalog food items linked to catering packages.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.open('/api/catalogs/items/report-pdf', '_blank')}
                className="bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center"
              >
                <FileDown className="w-4 h-4 mr-2" /> Download Report
              </button>
              <button
                onClick={() => setShowItemModal(true)}
                className="bg-blue-600 hover:bg-blue-750 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow transition-all flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Menu Item
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu Item Name</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Category</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Unit Price</th>
                  <th className="py-4 px-6 font-semibold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No menu items registered yet. Click &quot;Add Menu Item&quot; to register one.
                    </td>
                  </tr>
                ) : (
                  allItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-900 dark:text-white block">{item.itemName}</span>
                        {item.createdByName ? (
                          <span className="text-xs text-slate-400 block mt-0.5">Created by {item.createdByName}</span>
                        ) : item.createdByUserId ? (
                          <span className="text-xs text-slate-400 block mt-0.5">Created by user #{item.createdByUserId}</span>
                        ) : null}
                        {item.updatedByName ? (
                          <span className="text-xs text-slate-400 block">Updated by {item.updatedByName}</span>
                        ) : item.updatedByUserId ? (
                          <span className="text-xs text-slate-400 block">Updated by user #{item.updatedByUserId}</span>
                        ) : null}
                      </td>
                      <td className="py-4 px-6 text-center text-sm font-semibold capitalize text-slate-500">
                        {item.category.replace('_', ' ')}
                      </td>
                      <td className="py-4 px-6 text-right text-sm font-bold text-slate-900 dark:text-white">
                        ₱{Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-white"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL A: CREATE/EDIT MENU */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Utensils className="w-5 h-5 mr-2 text-blue-600" />
                {editMenu ? 'Edit Menu Package' : 'Register Menu Package'}
              </h3>
              <button onClick={() => setShowMenuModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMenu} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Menu Title (Unique)</label>
                <input
                  type="text"
                  required
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Executive Lunch Buffet"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Package Description</label>
                <textarea
                  rows={2}
                  value={menuDesc}
                  onChange={(e) => setMenuDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none resize-none"
                  placeholder="Describe package inclusions..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Billing Rate per Person (PHP)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={menuRate}
                  onChange={(e) => setMenuRate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Link Menu Item (Category Selector)</label>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 max-h-48 overflow-y-auto space-y-2">
                  {allItems.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No Menu Items registered. Register them in &quot;Menu Items&quot; tab first.</p>
                  ) : (
                    allItems.map((item) => (
                      <label key={item.id} className="flex items-center space-x-2.5 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50 p-1.5 rounded transition-all">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(String(item.id))}
                          onChange={() => handleItemSelectToggle(String(item.id))}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="font-medium text-slate-750 dark:text-slate-250">{item.itemName}</span>
                        <span className="text-xxs px-2 py-0.5 rounded-full border border-slate-250 text-slate-400 font-mono capitalize">
                          {item.category.toLowerCase().replace('_', ' ')}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="py-2 px-4 border border-slate-350 dark:border-slate-755 text-slate-650 dark:text-slate-350 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-750 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {editMenu ? 'Update Package' : 'Register Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL B: CREATE VENUE */}
      {showVenueModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Register Event Venue
              </h3>
              <button onClick={() => setShowVenueModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Venue Name (Unique)</label>
                <input
                  type="text"
                  required
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Grand Ballroom B"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Max Guest Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={venueCapacity}
                  onChange={(e) => setVenueCapacity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. 150"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Physical Address / Directions</label>
                <input
                  type="text"
                  required
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. 3rd Floor, West Wing Complex"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowVenueModal(false)}
                  className="py-2 px-4 border border-slate-350 dark:border-slate-755 text-slate-650 dark:text-slate-350 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-750 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Register Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL C: CREATE MENU ITEM */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <ListPlus className="w-5 h-5 mr-2 text-blue-600" />
                Add Menu Item
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Menu Item Name (Unique)</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Beef Caldereta"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Food Category</label>
                <select
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Unit Price (PHP)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="py-2 px-4 border border-slate-350 dark:border-slate-755 text-slate-650 dark:text-slate-350 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-750 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Register Menu Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL D: EDIT MENU ITEM */}
      {showEditItemModal && editItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center">
                <Edit className="w-5 h-5 mr-2 text-blue-600" />
                Edit Menu Item
              </h3>
              <button onClick={() => setShowEditItemModal(false)} className="text-slate-400 hover:text-slate-650 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Menu Item Name (Unique)</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="e.g. Beef Caldereta"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Food Category</label>
                <select
                  value={editItemCategory}
                  onChange={(e) => setEditItemCategory(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Unit Price (PHP)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editItemUnitPrice}
                  onChange={(e) => setEditItemUnitPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditItemModal(false)}
                  className="py-2 px-4 border border-slate-350 dark:border-slate-755 text-slate-650 dark:text-slate-350 rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-750 disabled:opacity-60 text-white rounded-lg text-sm font-bold shadow flex items-center transition-all"
                >
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
