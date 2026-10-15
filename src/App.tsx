import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MemberView } from './components/MemberView';
import { ReceptionistView } from './components/ReceptionistView';
import { AdminView } from './components/AdminView';
import { LoginModal } from './components/LoginModal';
import { api } from './services/api';
import { signOutUser } from './lib/auth';
import { supabase } from './lib/supabase';
import type { Role, Profile, DailyMenu, MealTransaction } from './types';
import { Loader2, ShieldAlert } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<(Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string }) | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('member');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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

      // If no currentUser yet, initialize with default Aarav Mehta M-101 or first member
      setCurrentUser((prev) => {
        if (prev) {
          // Refresh current user's profile with latest subscription data
          const updated = membersData.find(m => m.id === prev.id || m.member_number === prev.member_number);
          return updated || prev;
        }
        const defaultUser = membersData.find(m => m.member_number === 'M-101') || membersData[0] || null;
        if (defaultUser) {
          setCurrentRole(defaultUser.role);
        }
        return defaultUser;
      });
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

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .or(`auth_user_id.eq.${session.user.id},phone.eq.${session.user.phone?.replace('+91', '')}`)
            .maybeSingle();

          if (profile) {
            setCurrentUser(profile as Profile);
            setCurrentRole(profile.role);
          }
        } catch (authErr) {
          console.warn('Auth state sync note:', authErr);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handle successful login from LoginModal
  const handleLoginSuccess = (profile: Profile) => {
    // Find enriched member data if present
    const enriched = members.find(m => m.id === profile.id || m.member_number === profile.member_number) || profile;
    setCurrentUser(enriched);
    setCurrentRole(profile.role);
    setIsLoginModalOpen(false);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out note:', err);
    }
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  // Strict Role-Based View Guard
  const renderRoleGuardedContent = () => {
    if (!currentUser) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '32px 16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--color-stone)'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--color-ink)', marginBottom: '8px' }}>
            Sign In to Thali.com
          </h2>
          <p style={{ maxWidth: '440px', fontSize: '15px', color: 'var(--color-ash)', marginBottom: '24px' }}>
            Please authenticate using your verified mobile number to view your active meal pass or access staff tools.
          </p>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '15px', borderRadius: 'var(--radius-full)' }}
          >
            Sign In with Phone OTP
          </button>
        </div>
      );
    }

    // Strict Enforcement:
    // 1. Regular members can ONLY see MemberView. Admin and Receptionist views are blocked!
    if (currentUser.role === 'member') {
      return (
        <MemberView
          member={currentUser}
          menus={menus}
          activeMealPeriod={activeMealPeriod}
          onRefresh={loadData}
        />
      );
    }

    // 2. Receptionist staff can ONLY see ReceptionistView
    if (currentUser.role === 'receptionist') {
      return (
        <ReceptionistView
          members={members}
          activeMealPeriod={activeMealPeriod}
          recentTransactions={recentTransactions}
          onRefresh={loadData}
        />
      );
    }

    // 3. Owner Admin can access AdminView, or switch to view Receptionist or Member view for supervision
    if (currentUser.role === 'owner_admin') {
      if (currentRole === 'receptionist') {
        return (
          <ReceptionistView
            members={members}
            activeMealPeriod={activeMealPeriod}
            recentTransactions={recentTransactions}
            onRefresh={loadData}
          />
        );
      }
      if (currentRole === 'member') {
        return (
          <MemberView
            member={currentUser}
            menus={menus}
            activeMealPeriod={activeMealPeriod}
            onRefresh={loadData}
          />
        );
      }
      return (
        <AdminView
          members={members}
          menus={menus}
          onRefresh={loadData}
        />
      );
    }

    // Fallback for safety
    return (
      <MemberView
        member={currentUser}
        menus={menus}
        activeMealPeriod={activeMealPeriod}
        onRefresh={loadData}
      />
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header & Strict RBAC Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeMealPeriod={activeMealPeriod}
        onMealPeriodChange={setActiveMealPeriod}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
            <Loader2 size={36} className="animate-spin" color="var(--color-stone)" />
            <p style={{ color: 'var(--color-ash)', fontSize: '15px' }}>Connecting to Thali.com Database...</p>
          </div>
        ) : (
          renderRoleGuardedContent()
        )}
      </main>

      {/* Login Modal for Phone Number OTP and Test Accounts */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        allowClose={currentUser !== null}
      />

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
