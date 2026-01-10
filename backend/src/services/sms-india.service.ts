import axios from 'axios';

const MSG91_API_KEY = process.env.MSG91_API_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'INSUREBOOK';

/**
 * Send OTP via MSG91 (Indian SMS service)
 * Works with Indian phone numbers
 * @param phone - 10-digit phone number
 * @param otp - 6-digit OTP code
 * @returns Success status
 */
export const sendOTPviaMsg91 = async (phone: string, otp: string): Promise<boolean> => {
  try {
    if (!MSG91_API_KEY) {
      throw new Error('MSG91_API_KEY not configured');
    }

    const formattedPhone = phone.startsWith('+') ? phone.slice(2) : phone; // Remove +91 if present

    console.log(`📱 Sending OTP via MSG91 (India)...`);
    console.log(`   Phone: +91${formattedPhone}`);
    console.log(`   OTP: ${otp}`);

    const message = `Your Insurance Book OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;

    const response = await axios.get('https://api.msg91.com/apiv2/route', {
      params: {
        authkey: MSG91_API_KEY,
        mobiles: `91${formattedPhone}`,
        message: message,
        sender: MSG91_SENDER_ID,
        route: '4',
        DLT_TE_ID: process.env.MSG91_DLT_TE_ID || '',
      },
    });

    console.log(`✅ MSG91 API Response:`, response.status);

    if (response.status === 200) {
      const data = response.data;
      if (data.type === 'success' || data.request_id) {
        console.log(`✅ SMS sent successfully via MSG91`);
        console.log(`   Request ID: ${data.request_id}`);
        return true;
      }
    }

    throw new Error('MSG91 API returned error: ' + JSON.stringify(response.data));
  } catch (error: any) {
    console.error(`❌ MSG91 SMS Error: ${error.message}`);
    console.error(`   Phone: ${phone}`);
    console.error(`   Sender ID: ${MSG91_SENDER_ID}`);
    throw new Error(`Failed to send SMS via MSG91: ${error.message}`);
  }
};

/**
 * Send SMS via MSG91
 */
export const sendSMSviaMsg91 = async (phone: string, message: string): Promise<boolean> => {
  try {
    if (!MSG91_API_KEY) {
      throw new Error('MSG91_API_KEY not configured');
    }

    const formattedPhone = phone.startsWith('+') ? phone.slice(2) : phone;

    console.log(`📱 Sending SMS via MSG91...`);
    console.log(`   To: +91${formattedPhone}`);

    const response = await axios.get('https://api.msg91.com/apiv2/route', {
      params: {
        authkey: MSG91_API_KEY,
        mobiles: `91${formattedPhone}`,
        message: message,
        sender: MSG91_SENDER_ID,
        route: '4',
        DLT_TE_ID: process.env.MSG91_DLT_TE_ID || '',
      },
    });

    if (response.status === 200) {
      console.log(`✅ SMS sent via MSG91`);
      return true;
    }

    throw new Error('MSG91 API error');
  } catch (error: any) {
    console.error(`❌ SMS Error: ${error.message}`);
    throw new Error(`SMS sending failed: ${error.message}`);
  }
};
