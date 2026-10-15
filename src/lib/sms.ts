/**
 * Fast2SMS API Client for Real SMS OTP Delivery across India
 */
const FAST2SMS_API_KEY = import.meta.env.VITE_FAST2SMS_API_KEY || '';

export interface Fast2SmsResult {
  success: boolean;
  message: string;
  isSimulated?: boolean;
}

export async function sendFast2SmsOtp(phone10Digit: string, otpCode: string): Promise<Fast2SmsResult> {
  const cleanPhone = phone10Digit.replace(/\D/g, '').slice(-10);

  if (!FAST2SMS_API_KEY) {
    return {
      success: false,
      message: 'Fast2SMS API key not configured in .env',
      isSimulated: true
    };
  }

  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: `Your Thali.com verification OTP code is ${otpCode}. Valid for 10 minutes.`,
        language: 'english',
        numbers: cleanPhone
      })
    });

    const data = await res.json();

    if (data.return === true || data.status_code === 200) {
      return {
        success: true,
        message: 'Real OTP SMS sent successfully to your mobile number via Fast2SMS!'
      };
    }

    return {
      success: false,
      message: data.message || 'SMS delivery failed.',
      isSimulated: true
    };
  } catch (err: any) {
    console.error('Fast2SMS Network Error:', err);
    return {
      success: false,
      message: err.message || 'Network error reaching Fast2SMS gateway.',
      isSimulated: true
    };
  }
}
