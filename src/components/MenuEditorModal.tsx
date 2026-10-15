import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';

import type { DailyMenu } from '../types';
import { api } from '../services/api';

interface MenuEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMealPeriod?: 'lunch' | 'dinner';
  existingMenu?: DailyMenu;
}

interface MenuItemDraft {
  name: string;
  category: 'Dal' | 'Sabzi' | 'Roti' | 'Rice' | 'Special' | 'Sweet' | 'Side';
}

const CATEGORIES: ('Dal' | 'Sabzi' | 'Roti' | 'Rice' | 'Special' | 'Sweet' | 'Side')[] = [
  'Sabzi', 'Dal', 'Roti', 'Rice', 'Special', 'Sweet', 'Side'
];

export const MenuEditorModal: React.FC<MenuEditorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMealPeriod = 'lunch',
  existingMenu
}) => {
  const [mealPeriod, setMealPeriod] = useState<'lunch' | 'dinner'>(existingMenu?.meal_period || initialMealPeriod);
  const [title, setTitle] = useState(existingMenu?.title || (mealPeriod === 'lunch' ? 'Deluxe Afternoon Thali' : 'Evening Comfort Thali'));
  const [notes, setNotes] = useState(existingMenu?.notes || 'Freshly cooked home-style meal. Unlimited rice & dal refills.');
  
  const [items, setItems] = useState<MenuItemDraft[]>(
    existingMenu?.items && existingMenu.items.length > 0
      ? existingMenu.items.map(it => ({ name: it.name, category: it.category }))
      : [
          { name: 'Paneer Butter Masala', category: 'Sabzi' },
          { name: 'Yellow Dal Tadka', category: 'Dal' },
          { name: 'Phulka Roti (Desi Ghee)', category: 'Roti' },
          { name: 'Jeera Rice', category: 'Rice' },
          { name: 'Gulab Jamun', category: 'Sweet' }
        ]
  );

  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState<'Dal' | 'Sabzi' | 'Roti' | 'Rice' | 'Special' | 'Sweet' | 'Side'>('Sabzi');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    setItems(prev => [...prev, { name: newItemName.trim(), category: newItemCat }]);
    setNewItemName('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item to the menu.');
      return;
    }

    setIsSaving(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const ok = await api.saveDailyMenu(today, mealPeriod, title, notes, items);
      if (ok) {
        onSuccess();
        onClose();
      } else {
        alert('Could not save daily menu. Please check network connection.');
      }
    } catch (err) {
      console.error('Error saving menu:', err);
      alert('Failed to save menu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 27, 26, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 140,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: '#ffffff'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--color-clay)' }}>Kitchen & Dining Operations</span>
            <h3 style={{ fontSize: '24px', marginTop: '2px' }}>Publish Daily Menu</h3>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-pill" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Meal Period Selector */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => {
                setMealPeriod('lunch');
                setTitle('Deluxe Afternoon Thali');
              }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: mealPeriod === 'lunch' ? 'var(--color-stone)' : 'var(--color-canvas)',
                color: mealPeriod === 'lunch' ? '#fff' : 'var(--color-stone)'
              }}
            >
              🌞 Lunch Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setMealPeriod('dinner');
                setTitle('Evening Comfort Thali');
              }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: mealPeriod === 'dinner' ? 'var(--color-stone)' : 'var(--color-canvas)',
                color: mealPeriod === 'dinner' ? '#fff' : 'var(--color-stone)'
              }}
            >
              🌙 Dinner Menu
            </button>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '4px' }}>
              Menu Title / Theme:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)', display: 'block', marginBottom: '4px' }}>
              Chef Notes & Refill Rules:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unlimited Rice & Dal, 1 Sweet per member"
              className="form-input"
            />
          </div>

          {/* Dishes List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-stone)' }}>
                Menu Dishes ({items.length})
              </label>
              <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>Shown on all member passes</span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: 'var(--color-canvas)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              maxHeight: '220px',
              overflowY: 'auto'
            }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge" style={{ fontSize: '10px', backgroundColor: 'var(--color-canvas)', color: 'var(--color-stone)' }}>
                      {it.category}
                    </span>
                    <strong style={{ color: 'var(--color-ink)' }}>{it.name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ash)', padding: '4px' }}
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new dish input row */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value as any)}
                className="form-input"
                style={{ width: '120px', fontSize: '13px', padding: '8px' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Dish name (e.g. Aloo Gobi)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                className="form-input"
                style={{ flex: 1, fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-secondary"
                style={{ padding: '8px 14px' }}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={16} /> {isSaving ? 'Publishing...' : 'Publish Today\'s Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
