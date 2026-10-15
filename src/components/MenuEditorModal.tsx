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
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 140,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="eyebrow">Dining Operations</span>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginTop: '2px' }}>Publish Daily Menu</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-pill"
            style={{ padding: '6px', border: 'none', color: 'var(--color-ink-mute)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Meal Period Segmented Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '3px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-hairline)'
          }}>
            <button
              type="button"
              onClick={() => {
                setMealPeriod('lunch');
                setTitle('Deluxe Afternoon Thali');
              }}
              className="btn btn-pill"
              style={{
                flex: 1,
                backgroundColor: mealPeriod === 'lunch' ? '#ffffff' : 'transparent',
                color: mealPeriod === 'lunch' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: mealPeriod === 'lunch' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: mealPeriod === 'lunch' ? 500 : 400
              }}
            >
              Lunch Service
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
                backgroundColor: mealPeriod === 'dinner' ? '#ffffff' : 'transparent',
                color: mealPeriod === 'dinner' ? 'var(--color-ink)' : 'var(--color-ink-mute)',
                boxShadow: mealPeriod === 'dinner' ? 'var(--shadow-level-1)' : 'none',
                fontSize: '12px',
                fontWeight: mealPeriod === 'dinner' ? 500 : 400
              }}
            >
              Dinner Service
            </button>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
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
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', display: 'block', marginBottom: '4px' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                Menu Dishes ({items.length})
              </label>
              <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>Shown on all digital passes</span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backgroundColor: 'var(--color-canvas-soft)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '200px',
              overflowY: 'auto',
              border: '1px solid var(--color-hairline)'
            }}>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-hairline)',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-indigo" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {it.category}
                    </span>
                    <strong style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{it.name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-mute)', padding: '2px' }}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new dish input row */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <select
                value={newItemCat}
                onChange={(e) => setNewItemCat(e.target.value as any)}
                className="form-input"
                style={{ width: '100px', fontSize: '12px', padding: '6px' }}
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
                className="btn btn-secondary btn-pill"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-pill"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 2, gap: '6px' }}
            >
              <Save size={14} /> {isSaving ? 'Publishing...' : 'Publish Today\'s Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
