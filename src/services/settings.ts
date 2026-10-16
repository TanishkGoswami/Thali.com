import { supabase } from '../lib/supabase';

const OTP_CONFIG_KEY = 'thali_otp_enabled';
const CONFIG_MEMBER_NUMBER = 'SYS_CONFIG_OTP';

export const settingsService = {
  /**
   * Asynchronously fetches the current OTP verification toggle state.
   * Checks Supabase cloud database first and caches in localStorage.
   * Defaults to true (OTP enabled) if not configured.
   */
  async isOtpEnabled(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('pin_code')
        .eq('member_number', CONFIG_MEMBER_NUMBER)
        .maybeSingle();

      if (!error && data) {
        const isEnabled = data.pin_code !== 'false' && data.pin_code !== 'disabled';
        localStorage.setItem(OTP_CONFIG_KEY, isEnabled ? 'true' : 'false');
        return isEnabled;
      }
    } catch (e) {
      console.warn('Failed to fetch OTP setting from cloud, falling back to local cache:', e);
    }

    // Fallback to localStorage cache
    return this.getInstantOtpEnabled();
  },

  /**
   * Synchronous check from localStorage cache for immediate rendering without UI flicker.
   */
  getInstantOtpEnabled(): boolean {
    try {
      const local = localStorage.getItem(OTP_CONFIG_KEY);
      if (local !== null) {
        return local === 'true';
      }
    } catch (e) {
      console.warn('LocalStorage access note:', e);
    }
    return true; // Default: OTP is enabled
  },

  /**
   * Updates the OTP verification toggle state in both localStorage and Supabase.
   */
  async setOtpEnabled(enabled: boolean): Promise<boolean> {
    const val = enabled ? 'true' : 'false';

    try {
      localStorage.setItem(OTP_CONFIG_KEY, val);
    } catch (e) {
      console.warn('LocalStorage write note:', e);
    }

    // Broadcast local event for immediate reactivity across open tabs/components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('thali:otp_setting_changed', { detail: { enabled } })
      );
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            member_number: CONFIG_MEMBER_NUMBER,
            full_name: 'Fast2SMS OTP Verification Toggle',
            role: 'owner_admin',
            status: 'inactive',
            pin_code: val,
            qr_token: 'CONFIG_OTP_FLAG',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'member_number' }
        );

      if (error) {
        console.error('Failed to sync OTP toggle to Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error syncing OTP setting:', e);
      return false;
    }
  },

  /**
   * Subscribes to OTP setting changes both locally (via window events) and remotely (via Supabase Realtime).
   */
  subscribeToOtpSetting(callback: (enabled: boolean) => void): () => void {
    // 1. Local event listener
    const handleLocalEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        callback(customEvent.detail.enabled);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('thali:otp_setting_changed', handleLocalEvent);
    }

    // 2. Supabase Realtime subscription
    let channel: any = null;
    try {
      channel = supabase
        .channel('realtime_otp_config')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `member_number=eq.${CONFIG_MEMBER_NUMBER}`
          },
          (payload: any) => {
            const newRecord = payload.new;
            if (newRecord && newRecord.pin_code) {
              const isEnabled = newRecord.pin_code !== 'false' && newRecord.pin_code !== 'disabled';
              localStorage.setItem(OTP_CONFIG_KEY, isEnabled ? 'true' : 'false');
              callback(isEnabled);
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscription note:', e);
    }

    // Return cleanup unsubscribe function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('thali:otp_setting_changed', handleLocalEvent);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }
};
