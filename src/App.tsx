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
          activeMealPeriod={activeMealPeriod}
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-canvas)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Signature Atmospheric Gradient Mesh Hero Backdrop */}
      <div className="gradient-mesh-hero" />

      {/* Top Header & Strict RBAC Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" color="var(--color-primary)" />
            <p style={{ color: 'var(--color-ink-mute)', fontSize: '14px' }}>Connecting to Thali.com Network...</p>
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

      {/* Stripe-style Footer: Clean light canvas with hairline divider */}
      <footer style={{
        backgroundColor: '#ffffff',
        color: 'var(--color-ink-mute)',
        padding: '32px 24px',
        marginTop: 'auto',
        borderTop: '1px solid var(--color-hairline)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.2px' }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
              Digital Mess Infrastructure & Meal Pass Verification
            </p>
          </div>
          <div className="tnum" style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--color-ink-mute-2)', flexWrap: 'wrap' }}>
            <span>Timezone: Asia/Kolkata</span>
            <span>Plan: ₹2,800 / 54 Meals</span>
            <span>Anti-Duplicate: 1 Lunch + 1 Dinner / day</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
