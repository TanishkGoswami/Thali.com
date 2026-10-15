import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MemberView } from './components/MemberView';
import { ReceptionistView } from './components/ReceptionistView';
import { AdminView } from './components/AdminView';
import { api } from './services/api';
import type { Role, Profile, DailyMenu, MealTransaction } from './types';
import { Loader2 } from 'lucide-react';

export function App() {
  const [currentRole, setCurrentRole] = useState<Role>('receptionist');
  const [activeMealPeriod, setActiveMealPeriod] = useState<'lunch' | 'dinner'>('lunch');
  const [members, setMembers] = useState<(Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string })[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<(MealTransaction & { member_name?: string; member_number?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Load live data from Supabase
  const loadData = async () => {
    try {
      const [membersData, menusData, txsData] = await Promise.all([
        api.getMembers(),
        api.getTodayMenus(),
        api.getRecentTransactions()
      ]);
      setMembers(membersData);
      setMenus(menusData);
      setRecentTransactions(txsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-detect current meal session by local time
    const currentHour = new Date().getHours();
    if (currentHour >= 16 || currentHour < 5) {
      setActiveMealPeriod('dinner');
    } else {
      setActiveMealPeriod('lunch');
    }
  }, []);

  // Pick default member (Aarav Mehta M-101 or first member)
  const activeMember = members.find(m => m.member_number === 'M-101') || members[0];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Role Switcher */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeMealPeriod={activeMealPeriod}
        onMealPeriodChange={setActiveMealPeriod}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
            <Loader2 size={36} className="animate-spin" color="var(--color-stone)" />
            <p style={{ color: 'var(--color-ash)', fontSize: '15px' }}>Connecting to Thali.com Database...</p>
          </div>
        ) : (
          <>
            {currentRole === 'member' && activeMember && (
              <MemberView
                member={activeMember}
                menus={menus}
                activeMealPeriod={activeMealPeriod}
                onRefresh={loadData}
              />
            )}

            {currentRole === 'receptionist' && (
              <ReceptionistView
                members={members}
                activeMealPeriod={activeMealPeriod}
                recentTransactions={recentTransactions}
                onRefresh={loadData}
              />
            )}

            {currentRole === 'owner_admin' && (
              <AdminView
                members={members}
                menus={menus}
                onRefresh={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Footer styled with Oura's Ink Band Soft */}
      <footer style={{
        backgroundColor: 'var(--color-ink-band-soft)',
        color: 'var(--color-on-dark)',
        padding: '32px 24px',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 300 }}>
              Thali.com
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-mute)', marginTop: '4px' }}>
              Digital Mess Management & Meal Pass System • Built for 400+ Members
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--color-mute)' }}>
            <span>Timezone: Asia/Kolkata</span>
            <span>Plan: ₹2,800 / 54 Meals</span>
            <span>Duplicate Rule: 1 Lunch + 1 Dinner / day</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
