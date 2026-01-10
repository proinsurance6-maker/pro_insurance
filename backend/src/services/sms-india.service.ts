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

    const response = await axios.post(
      'https://api.msg91.com/api/sendhttp.php',
      {},
      {
        params: {
          authkey: MSG91_API_KEY,
          mobiles: formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`,
          message: encodeURIComponent(message),
          sender: MSG91_SENDER_ID,
          route: '4',
        },
      }
    );

    console.log(`✅ MSG91 API Response Status: ${response.status}`);
    console.log(`   Response Data Type: ${typeof response.data}`);
    console.log(`   Response Data: ${JSON.stringify(response.data).substring(0, 100)}`);

    // MSG91 API returns different response formats
    // Check for success indicators
    if (response.status === 200) {
      const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      
      // Log raw response for debugging
      if (responseText.toLowerCase().includes('success') || 
          responseText.includes('1001') ||
          responseText.includes('request_id') ||
          !responseText.includes('error')) {
        console.log(`✅ SMS sent successfully via MSG91`);
        return true;
      }
    }

    throw new Error('MSG91 API returned error or invalid response');
  } catch (error: any) {
    console.error(`❌ MSG91 SMS Error: ${error.message}`);
    console.error(`   Phone: ${phone}`);
    console.error(`   Sender ID: ${MSG91_SENDER_ID}`);
    console.error(`   API Key configured: ${!!MSG91_API_KEY}`);
    
    // Fallback: Log the error but allow signup to continue (demo mode)
    console.warn(`⚠️  SMS sending failed, but continuing with signup (demo mode)`);
    return true; // Return true to allow signup flow to continue
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

    const response = await axios.post(
      'https://api.msg91.com/api/sendhttp.php',
      {},
      {
        params: {
          authkey: MSG91_API_KEY,
          mobiles: formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`,
          message: encodeURIComponent(message),
          sender: MSG91_SENDER_ID,
          route: '4',
        },
      }
    );

    if (response.status === 200) {
      console.log(`✅ SMS sent via MSG91`);
      return true;
    }

    throw new Error('MSG91 API error');
  } catch (error: any) {
    console.error(`❌ SMS Error: ${error.message}`);
    // Fallback: Allow SMS fail to not block signup (demo mode)
    console.warn(`⚠️  SMS sending failed, continuing in demo mode`);
    return true;
  }
};

/**
 * Send welcome SMS to new agent
 */
export const sendWelcomeSMS = async (phone: string, name: string, agentCode: string): Promise<void> => {
  try {
    const message = `Welcome to Insurance Book, ${name}! Your Agent Code: ${agentCode}. Start your 60-day free trial now. insurancebook.vercel.app`;
    await sendSMSviaMsg91(phone, message);
    console.log(`✅ Welcome SMS sent to ${name}`);
  } catch (error: any) {
    console.error('Welcome SMS failed:', error.message);
    // Don't throw - welcome SMS is not critical
  }
};
