import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MemberView } from './components/MemberView';
import { ReceptionistView } from './components/ReceptionistView';
import { AdminView } from './components/AdminView';
import { LoginModal } from './components/LoginModal';
import { api } from './services/api';
import { signOutUser, getLocalSessionId } from './lib/auth';
import { supabase } from './lib/supabase';
import type { Role, Profile, DailyMenu, MealTransaction } from './types';
import { Loader2 } from 'lucide-react';

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

      // Authenticated session check: Only restore if a real user logged in previously
      const savedUserId = getLocalSessionId();
      if (savedUserId) {
        const matchingUser = membersData.find(m => m.id === savedUserId);
        if (matchingUser) {
          setCurrentUser(matchingUser);
          setCurrentRole(matchingUser.role);
        } else {
          setCurrentUser(null);
        }
      } else {
        // If no user has logged in, remain strictly logged out!
        setCurrentUser(null);
      }
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
    loadData();
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Sign out note:', err);
    }
    setCurrentUser(null);
    setIsLoginModalOpen(false);
  };

  // Strict Role-Based View Guard
  const renderRoleGuardedContent = () => {
    // When not logged in, show ONLY the dedicated full-screen Login / Sign-in page!
    if (!currentUser) {
      return (
        <LoginModal
          isOpen={true}
          embedded={true}
          onLoginSuccess={handleLoginSuccess}
          allowClose={false}
        />
      );
    }

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

      {/* Floating Login Modal (for switching or staff login while already logged in) */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          allowClose={currentUser !== null}
        />
      )}

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
