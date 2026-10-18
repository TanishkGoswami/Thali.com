import { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabase';
import type { Profile, DailyMenu, MealPeriod } from '../types';
import { 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ShieldCheck,
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface TGUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export function TelegramMiniApp() {
  const [tgUser, setTgUser] = useState<TGUser | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [remainingMeals, setRemainingMeals] = useState<number>(50);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [closures, setClosures] = useState<any>({});
  const [skips, setSkips] = useState<string[]>([]);
  const [linkingId, setLinkingId] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pass' | 'menu' | 'admin'>('pass');
  const [adminStatusNotice, setAdminStatusNotice] = useState('');

  const todayStr = useMemo(() => {
    const now = new Date();
    const kolkataOffset = 5.5 * 60 * 60 * 1000;
    const kolkataTime = new Date(now.getTime() + kolkataOffset);
    return kolkataTime.toISOString().split('T')[0];
  }, []);

  // 1. Initialize Telegram WebApp SDK & Theme
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setIsDark(tg.colorScheme === 'dark');

      const onThemeChange = () => {
        setIsDark(tg.colorScheme === 'dark');
      };
      tg.onEvent('themeChanged', onThemeChange);

      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user);
      }
    }

    // URL parameter fallback for direct testing in browser
    const params = new URLSearchParams(window.location.search);
    const testId = params.get('tgId') || params.get('chatId');
    if (testId && !tgUser) {
      setTgUser({
        id: Number(testId),
        first_name: params.get('name') || 'Member',
        username: params.get('username') || undefined
      });
    }
  }, []);

  // 2. Fetch User Profile & Data from Supabase
  const loadUserData = async (chatIdNum?: number, usernameStr?: string) => {
    setLoading(true);
    try {
      const idToSearch = chatIdNum || tgUser?.id;
      const unameToSearch = usernameStr || tgUser?.username;

      let matchedProfile: Profile | null = null;

      if (idToSearch) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('telegram_chat_id', String(idToSearch))
          .maybeSingle();
        matchedProfile = data;
      }

      if (!matchedProfile && unameToSearch) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('telegram_username', unameToSearch)
          .maybeSingle();
        matchedProfile = data;
      }

      // Default demo member fallback if user is testing with default credentials
      if (!matchedProfile && (idToSearch === 8431630843 || unameToSearch === 'tanishkgoswami')) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('member_number', 'M-112')
          .maybeSingle();
        matchedProfile = data;
      }

      if (matchedProfile) {
        setProfile(matchedProfile);

        // Fetch active subscription & balance
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('member_id', matchedProfile.id)
          .order('created_at', { ascending: false });

        const activeSub = (subs || []).find(s => s.status === 'active') || subs?.[0];
        setSubscription(activeSub || null);

        if (activeSub) {
          const { data: txs } = await supabase
            .from('meal_transactions')
            .select('meal_delta')
            .eq('subscription_id', activeSub.id)
            .eq('status', 'accepted');

          const consumed = (txs || []).reduce((sum, t) => sum + (t.meal_delta || 0), 0);
          setRemainingMeals(Math.max(0, activeSub.meals_granted + consumed));
        }

        // Generate QR Pass URL
        const token = matchedProfile.qr_token || `QR_MEM_${matchedProfile.member_number}`;
        const qrUrl = await QRCode.toDataURL(token, {
          width: 320,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' }
        });
        setQrCodeDataUrl(qrUrl);

        // Fetch Today's skips for this member
        const { data: skipsData } = await supabase
          .from('meal_skips')
          .select('meal_period')
          .eq('member_id', matchedProfile.id)
          .eq('service_date', todayStr);
        setSkips((skipsData || []).map(s => s.meal_period));
      }

      // Fetch menus & closures
      const [menusRes, closuresRes] = await Promise.all([
        supabase.from('menus').select('*, items:menu_items(*)').eq('service_date', todayStr),
        fetch('/data/mess_closures.json').then(r => r.json()).catch(() => ({}))
      ]);

      if (menusRes.data) setMenus(menusRes.data);
      if (closuresRes?.[todayStr]) setClosures(closuresRes[todayStr]);

    } catch (err) {
      console.error('Error loading Telegram Mini App data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tgUser) {
      loadUserData(tgUser.id, tgUser.username);
    } else {
      loadUserData();
    }
  }, [tgUser, todayStr]);

  // 3. Handle Account Linking (If member is not linked yet)
  const handleLinkAccount = async () => {
    if (!linkingId.trim()) return;
    setLinkingLoading(true);
    setLinkingError('');

    try {
      const cleanVal = linkingId.trim().toUpperCase();
      const phoneDigits = cleanVal.replace(/\D/g, '');

      let query = supabase.from('profiles').select('*');
      if (cleanVal.startsWith('M-') || cleanVal.startsWith('M')) {
        query = query.ilike('member_number', cleanVal);
      } else if (phoneDigits.length >= 7) {
        query = query.ilike('phone', `%${phoneDigits.slice(-10)}%`);
      }

      const { data: profiles } = await query.limit(1);
      if (!profiles || profiles.length === 0) {
        setLinkingError('No matching membership found. Please enter valid Member ID (e.g. M-112).');
        setLinkingLoading(false);
        return;
      }

      const matched = profiles[0];
      const chatIdToSave = tgUser?.id ? String(tgUser.id) : '';

      if (chatIdToSave) {
        await supabase
          .from('profiles')
          .update({
            telegram_chat_id: chatIdToSave,
            telegram_username: tgUser?.username || ''
          })
          .eq('id', matched.id);
      }

      await loadUserData(tgUser?.id, tgUser?.username);
    } catch (err: any) {
      setLinkingError(err.message || 'Error connecting account');
    } finally {
      setLinkingLoading(false);
    }
  };

  // 4. Handle RSVP Skip / Attend
  const toggleRsvp = async (period: MealPeriod) => {
    if (!profile) return;
    const isCurrentlySkipped = skips.includes(period);

    try {
      if (isCurrentlySkipped) {
        await supabase
          .from('meal_skips')
          .delete()
          .eq('member_id', profile.id)
          .eq('service_date', todayStr)
          .eq('meal_period', period);
        setSkips(prev => prev.filter(p => p !== period));
      } else {
        await supabase.from('meal_skips').upsert({
          member_id: profile.id,
          service_date: todayStr,
          meal_period: period,
          reason: 'Marked Skip via Telegram Mini App'
        }, { onConflict: 'member_id,service_date,meal_period' });
        setSkips(prev => [...prev, period]);
      }
    } catch (err) {
      console.error('Error toggling RSVP:', err);
    }
  };

  const isAllDayClosed = Boolean(
    closures.all_day || 
    (closures.breakfast && closures.lunch && closures.dinner)
  );

  const isAdmin = profile?.role === 'owner_admin' || String(tgUser?.id) === '5518134307';

  // Native BotFather Color Palette Tokens
  const theme = {
    bg: isDark ? '#0e1621' : '#f4f4f5',
    headerBg: isDark ? '#17212b' : '#ffffff',
    cardBg: isDark ? '#1e2c3a' : '#ffffff',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    textPrimary: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#7e8c9b' : '#6b7280',
    accent: '#2481cc',
    accentHover: '#1c6fb3',
    cardSubtle: isDark ? '#16222f' : '#f9fafb',
    danger: '#e53935',
    success: '#4caf50'
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.textSecondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: `3px solid ${theme.cardBorder}`,
          borderTopColor: theme.accent,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', fontSize: '14px' }}>Loading Thali Assistant...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '32px'
    }}>
      {/* 1. BotFather Style Top Header */}
      <div style={{
        backgroundColor: theme.headerBg,
        borderBottom: `1px solid ${theme.cardBorder}`,
        padding: '20px 16px 16px 16px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#ff6b35',
          margin: '0 auto 12px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <img src="/logo.png" alt="Thali.com" style={{ width: '56px', height: '56px', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: theme.textPrimary }}>
            Thali Mess Assistant
          </h1>
          <span style={{ color: theme.accent, display: 'inline-flex', alignItems: 'center' }}>
            <CheckCircle2 size={18} fill={theme.accent} color={theme.headerBg} />
          </span>
        </div>

        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: theme.textSecondary, lineHeight: 1.4 }}>
          {profile 
            ? `Welcome, ${profile.full_name} (${profile.member_number})`
            : 'Official dining & mess companion for Thali.com members.'}
        </p>

        {/* Tab Switcher if Admin */}
        {isAdmin && (
          <div style={{
            display: 'inline-flex',
            marginTop: '14px',
            backgroundColor: theme.cardSubtle,
            borderRadius: '10px',
            padding: '3px',
            border: `1px solid ${theme.cardBorder}`
          }}>
            <button
              onClick={() => setActiveTab('pass')}
              style={{
                border: 'none',
                background: activeTab === 'pass' ? theme.cardBg : 'transparent',
                color: activeTab === 'pass' ? theme.textPrimary : theme.textSecondary,
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              My Dining Pass
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              style={{
                border: 'none',
                background: activeTab === 'menu' ? theme.cardBg : 'transparent',
                color: activeTab === 'menu' ? theme.textPrimary : theme.textSecondary,
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Today's Menu
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                border: 'none',
                background: activeTab === 'admin' ? theme.cardBg : 'transparent',
                color: activeTab === 'admin' ? theme.textPrimary : theme.textSecondary,
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Admin Controls
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
        {/* Not Linked Onboarding Card */}
        {!profile && (
          <div style={{
            backgroundColor: theme.cardBg,
            borderRadius: '14px',
            padding: '20px',
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: theme.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <UserCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Connect Your Membership</h3>
                <p style={{ margin: 0, fontSize: '12px', color: theme.textSecondary }}>Instant zero-password linking</p>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: theme.textSecondary, lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Apna **Member ID** (jaise <code style={{ color: theme.accent }}>M-112</code>) ya registered mobile number daalein:
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. M-112 or Phone"
                value={linkingId}
                onChange={e => setLinkingId(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: theme.cardSubtle,
                  border: `1px solid ${theme.cardBorder}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: theme.textPrimary,
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleLinkAccount}
                disabled={linkingLoading}
                style={{
                  backgroundColor: theme.accent,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: linkingLoading ? 0.7 : 1
                }}
              >
                {linkingLoading ? 'Connecting...' : 'Connect'}
              </button>
            </div>

            {linkingError && (
              <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: theme.danger }}>
                {linkingError}
              </p>
            )}
          </div>
        )}

        {/* Linked Member View */}
        {profile && activeTab === 'pass' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Member Overview Pill */}
            <div style={{
              backgroundColor: theme.cardBg,
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${theme.cardBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#2481cc20',
                  color: theme.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px'
                }}>
                  {profile.full_name?.charAt(0)?.toUpperCase() || 'M'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{profile.full_name}</div>
                  <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                    ID: <span style={{ fontWeight: 600, color: theme.accent }}>{profile.member_number}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: '#4caf5020',
                  color: theme.success,
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {subscription?.status === 'active' ? 'Active Pass' : 'Active'}
                </div>
                <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
                  {remainingMeals} Meals Left
                </div>
              </div>
            </div>

            {/* Digital QR Code Card */}
            <div style={{
              backgroundColor: theme.cardBg,
              borderRadius: '16px',
              padding: '24px 16px',
              border: `1px solid ${theme.cardBorder}`,
              textAlign: 'center'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.textSecondary, fontSize: '12px', marginBottom: '14px' }}>
                <QrCode size={16} />
                <span>Present at dining desk scanner</span>
              </div>

              {qrCodeDataUrl ? (
                <div style={{
                  display: 'inline-block',
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                }}>
                  <img src={qrCodeDataUrl} alt="QR Pass" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>
              ) : (
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Loading Pass...
                </div>
              )}

              <div style={{ marginTop: '16px', fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>
                {profile.qr_token || `QR_MEM_${profile.member_number}`}
              </div>
              <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '2px' }}>
                Auto-validates attendance in 1 second
              </div>
            </div>

            {/* Mess Status / Today's Service Card */}
            {isAllDayClosed ? (
              <div style={{
                backgroundColor: isDark ? '#2e1c1c' : '#fef2f2',
                border: `1px solid ${isDark ? '#5c2b2b' : '#fecaca'}`,
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.danger, fontWeight: 600, fontSize: '14px' }}>
                  <AlertTriangle size={18} />
                  <span>Mess Closed Today</span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: theme.textSecondary, lineHeight: 1.4 }}>
                  Reason: <strong>{closures.all_day?.reason || 'Holiday / Kitchen Maintenance'}</strong>. Zero meals deducted and attendance is marked excused.
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: theme.cardBg,
                borderRadius: '14px',
                padding: '16px',
                border: `1px solid ${theme.cardBorder}`
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Today's Meal Attendance RSVP</span>
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>{todayStr}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Lunch RSVP */}
                  <div style={{
                    backgroundColor: theme.cardSubtle,
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>Lunch (12:30 PM – 03:30 PM)</div>
                      <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                        {closures.lunch ? `Closed: ${closures.lunch.reason}` : (skips.includes('lunch') ? 'Status: Skipping' : 'Status: Attending')}
                      </div>
                    </div>

                    {!closures.lunch && (
                      <button
                        onClick={() => toggleRsvp('lunch')}
                        style={{
                          backgroundColor: skips.includes('lunch') ? '#e5393520' : '#4caf5020',
                          color: skips.includes('lunch') ? theme.danger : theme.success,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {skips.includes('lunch') ? 'Mark Coming' : 'Skip Meal'}
                      </button>
                    )}
                  </div>

                  {/* Dinner RSVP */}
                  <div style={{
                    backgroundColor: theme.cardSubtle,
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>Dinner (07:30 PM – 10:30 PM)</div>
                      <div style={{ fontSize: '12px', color: theme.textSecondary }}>
                        {closures.dinner ? `Closed: ${closures.dinner.reason}` : (skips.includes('dinner') ? 'Status: Skipping' : 'Status: Attending')}
                      </div>
                    </div>

                    {!closures.dinner && (
                      <button
                        onClick={() => toggleRsvp('dinner')}
                        style={{
                          backgroundColor: skips.includes('dinner') ? '#e5393520' : '#4caf5020',
                          color: skips.includes('dinner') ? theme.danger : theme.success,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {skips.includes('dinner') ? 'Mark Coming' : 'Skip Meal'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              backgroundColor: theme.cardBg,
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${theme.cardBorder}`
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600 }}>Daily Mess Menu</h3>
              
              {isAllDayClosed ? (
                <p style={{ margin: 0, fontSize: '13px', color: theme.textSecondary }}>
                  Mess is closed today ({closures.all_day?.reason || 'Holiday'}). No dishes scheduled.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {(['breakfast', 'lunch', 'dinner'] as const).map((period) => {
                    const foundMenu = menus.find(m => m.meal_period === period);
                    const dishText = foundMenu?.items?.map(i => i.name).join(', ') || (
                      period === 'breakfast' ? 'Indori Poha with Sev, Sprouted Moong Salad, Masala Chai' :
                      period === 'lunch' ? 'Paneer Butter Masala, Yellow Dal Tadka, Fresh Tawa Phulkas, Jeera Rice' :
                      'Shahi Malai Kofta Curry, Dal Fry with Ghee, Fresh Phulkas, Hot Gulab Jamun'
                    );
                    const label = period.charAt(0).toUpperCase() + period.slice(1);
                    const timeRange = period === 'breakfast' ? '07:30 AM – 10:30 AM' : period === 'lunch' ? '12:30 PM – 03:30 PM' : '07:30 PM – 10:30 PM';
                    const isClosed = closures[period];

                    return (
                      <div key={period}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: theme.accent }}>
                          {label} ({timeRange})
                        </h4>
                        <p style={{ margin: 0, fontSize: '13px', color: isClosed ? theme.danger : theme.textSecondary, lineHeight: 1.5 }}>
                          {isClosed ? `Closed: ${closures[period]?.reason || 'Holiday'} (No meal deducted)` : dishText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Controls Tab */}
        {isAdmin && activeTab === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              backgroundColor: theme.cardBg,
              borderRadius: '14px',
              padding: '16px',
              border: `1px solid ${theme.cardBorder}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color={theme.accent} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Executive Admin Controls</h3>
                </div>
                <button
                  onClick={() => {
                    loadUserData();
                    setAdminStatusNotice('Data refreshed from live servers.');
                    setTimeout(() => setAdminStatusNotice(''), 3000);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'transparent',
                    border: `1px solid ${theme.cardBorder}`,
                    color: theme.textSecondary,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              </div>

              {adminStatusNotice && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#4caf5020',
                  color: theme.success,
                  fontSize: '13px',
                  borderRadius: '8px',
                  marginBottom: '14px'
                }}>
                  {adminStatusNotice}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{
                  backgroundColor: theme.cardSubtle,
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Mess Operational Status</div>
                    <div style={{ fontSize: '12px', color: isAllDayClosed ? theme.danger : theme.success }}>
                      {isAllDayClosed ? `Closed: ${closures.all_day?.reason || 'Holiday'}` : 'Operational (Active)'}
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: theme.textSecondary }}>Managed via Bot</span>
                </div>

                <div style={{
                  backgroundColor: theme.cardSubtle,
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>Kitchen Attendance</div>
                    <div style={{ fontSize: '12px', color: theme.textSecondary }}>Live forecasting active</div>
                  </div>
                  <ChevronRight size={18} color={theme.textSecondary} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
