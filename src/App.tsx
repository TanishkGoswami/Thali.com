import { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MemberView } from './components/MemberView';
import { ReceptionistView } from './components/ReceptionistView';
import { AdminView } from './components/AdminView';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { api } from './services/api';
import { signOutUser, getLocalSessionId, saveLocalSession, clearLocalSession } from './lib/auth';
import { supabase } from './lib/supabase';
import { DEMO_MEMBER, DEMO_RECEPTIONIST, DEMO_ADMIN, isDemoUser } from './lib/demoData';
import type { Role, Profile, DailyMenu, MealTransaction, MealPeriod } from './types';
import { Loader2 } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<(Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string; payment_method?: 'cash' | 'upi_direct' }) | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('member');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeMealPeriod, setActiveMealPeriod] = useState<MealPeriod>('lunch');
  const [members, setMembers] = useState<(Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string; payment_method?: 'cash' | 'upi_direct' })[]>([]);
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
        if (savedUserId === DEMO_MEMBER.id) {
          setCurrentUser(DEMO_MEMBER);
          setCurrentRole('member');
        } else if (savedUserId === DEMO_RECEPTIONIST.id) {
          setCurrentUser(DEMO_RECEPTIONIST);
          setCurrentRole('receptionist');
        } else if (savedUserId === DEMO_ADMIN.id) {
          setCurrentUser(DEMO_ADMIN);
          setCurrentRole('owner_admin');
        } else {
          const matchingUser = membersData.find(m => m.id === savedUserId);
          if (matchingUser) {
            setCurrentUser(matchingUser);
            setCurrentRole(matchingUser.role);
          } else {
            setCurrentUser(null);
          }
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

    // Auto-detect current meal session by local time:
    // 05:00 - 11:30: Breakfast
    // 11:30 - 16:30: Lunch
    // 16:30 - 05:00: Dinner
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const timeVal = currentHour + currentMin / 60;

    if (timeVal >= 5 && timeVal < 11.5) {
      setActiveMealPeriod('breakfast');
    } else if (timeVal >= 11.5 && timeVal < 16.5) {
      setActiveMealPeriod('lunch');
    } else {
      setActiveMealPeriod('dinner');
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
    saveLocalSession(profile.id);
    if (isDemoUser(profile)) {
      if (profile.id === DEMO_MEMBER.id) {
        setCurrentUser(DEMO_MEMBER);
        setCurrentRole('member');
      } else if (profile.id === DEMO_RECEPTIONIST.id) {
        setCurrentUser(DEMO_RECEPTIONIST);
        setCurrentRole('receptionist');
      } else if (profile.id === DEMO_ADMIN.id) {
        setCurrentUser(DEMO_ADMIN);
        setCurrentRole('owner_admin');
      }
    } else {
      const enriched = members.find(m => m.id === profile.id || m.member_number === profile.member_number) || profile;
      setCurrentUser(enriched);
      setCurrentRole(profile.role);
    }
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
    clearLocalSession();
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
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      );
    }

    // 2. Receptionist staff can ONLY see ReceptionistView
    if (currentUser.role === 'receptionist') {
      return (
        <ReceptionistView
          members={members}
          activeMealPeriod={activeMealPeriod}
          onMealPeriodChange={setActiveMealPeriod}
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
            onMealPeriodChange={setActiveMealPeriod}
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
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onSwitchToAdmin={() => setCurrentRole('owner_admin')}
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
        onOpenProfile={() => setIsProfileModalOpen(true)}
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
        activeMealPeriod={activeMealPeriod}
        onMealPeriodChange={setActiveMealPeriod}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Interactive Demo Mode Top Banner */}
      {isDemoUser(currentUser) && (
        <div style={{
          backgroundColor: '#0d253d',
          color: '#ffffff',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          position: 'sticky',
          top: '57px',
          zIndex: 49,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 600,
              fontSize: '11px'
            }}>
              ⚡ Live Demo Sandbox
            </span>
            <span style={{ color: '#cbd5e1' }}>
              Testing as: <strong style={{ color: '#ffffff' }}>{currentUser?.full_name}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginRight: '4px' }}>Switch Persona:</span>
            <button
              type="button"
              onClick={() => {
                setCurrentUser(DEMO_MEMBER);
                setCurrentRole('member');
                saveLocalSession(DEMO_MEMBER.id);
              }}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'member' ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: currentRole === 'member' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentUser(DEMO_RECEPTIONIST);
                setCurrentRole('receptionist');
                saveLocalSession(DEMO_RECEPTIONIST.id);
              }}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'receptionist' ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: currentRole === 'receptionist' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              ⚡ Frontdesk
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentUser(DEMO_ADMIN);
                setCurrentRole('owner_admin');
                saveLocalSession(DEMO_ADMIN.id);
              }}
              className="btn btn-pill"
              style={{
                backgroundColor: currentRole === 'owner_admin' ? 'var(--color-primary)' : 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: 'none',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: currentRole === 'owner_admin' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              👑 Mess Owner
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-pill"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '4px 10px',
                fontSize: '11px',
                marginLeft: '6px',
                cursor: 'pointer'
              }}
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

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

      {/* Member Profile Modal */}
      {isProfileModalOpen && currentUser && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onUpdateSuccess={(updatedData) => {
            if (updatedData) {
              setCurrentUser(prev => prev ? ({ ...prev, ...updatedData }) : null);
            }
            loadData();
          }}
        />
      )}

      {/* Floating Login Modal (for switching or staff login while already logged in) */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
          allowClose={currentUser !== null}
        />
      )}

      {/* Clean Professional Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        color: 'var(--color-ink-mute)',
        padding: '22px 24px',
        marginTop: 'auto',
        borderTop: '1px solid var(--color-hairline)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Thali.com" style={{ width: '22px', height: '22px', borderRadius: '6px' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </span>
            <span style={{ color: 'var(--color-ink-mute-2)', fontSize: '13px' }}>
              — Modern Dining Hall & Hostel Mess Operating System
            </span>
          </div>
          <div className="tnum" style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-ink-mute-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              All Systems Operational
            </span>
            <span>Asia/Kolkata</span>
            <span>Plan: ₹2,800 / 54 Meals</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
