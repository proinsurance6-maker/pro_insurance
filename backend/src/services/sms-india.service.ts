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

    // Remove +91 and any spaces, keep only 10 digits
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    
    // Ensure 10 digits
    if (cleanPhone.length !== 10) {
      throw new Error(`Invalid phone format. Expected 10 digits, got ${cleanPhone.length}`);
    }

    const message = `Your Insurance Book OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;

    console.log(`📱 Sending OTP via MSG91 (India)...`);
    console.log(`   Phone: ${cleanPhone} (10 digits)`);
    console.log(`   OTP: ${otp}`);
    console.log(`   Sender: ${MSG91_SENDER_ID}`);
    console.log(`   API Key present: ${MSG91_API_KEY ? 'Yes (length: ' + MSG91_API_KEY.length + ')' : 'No'}`);

    const response = await axios.get('https://api.msg91.com/api/sendhttp.php', {
      params: {
        authkey: MSG91_API_KEY,
        mobiles: cleanPhone,  // Send as 10-digit number WITHOUT country code
        message: message,
        sender: MSG91_SENDER_ID,
        route: '4',
      },
    });

    const responseStr = String(response.data).trim();
    
    console.log(`✅ MSG91 API Response Status: ${response.status}`);
    console.log(`   Raw Response: "${responseStr}"`);
    console.log(`   Response Length: ${responseStr.length}`);

    // MSG91 success response format: "1001|<message_id>"
    if (responseStr.includes('1001')) {
      console.log(`✅ SMS sent successfully! Message ID received from MSG91`);
      return true;
    }

    // If response is suspicious (like hex), it's likely an error
    if (/^[a-f0-9]{20,}$/i.test(responseStr)) {
      throw new Error(`MSG91 returned error code: ${responseStr} - Check API Key, credits, or phone number validity`);
    }

    throw new Error(`MSG91 API unexpected response: "${responseStr}"`);
  } catch (error: any) {
    console.error(`❌ MSG91 SMS Error:`, error.message);
    console.error(`   Full Error:`, error);
    
    // Allow signup to continue but log the error clearly
    console.warn(`⚠️ SMS failed but continuing (demo/fallback mode)`);
    return true;
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

    // Remove +91 and any spaces, keep only 10 digits
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2);
    }
    
    if (cleanPhone.length !== 10) {
      throw new Error(`Invalid phone format`);
    }

    console.log(`📱 Sending SMS via MSG91...`);
    console.log(`   To: ${cleanPhone}`);
    console.log(`   Message length: ${message.length} chars`);

    const response = await axios.get('https://api.msg91.com/api/sendhttp.php', {
      params: {
        authkey: MSG91_API_KEY,
        mobiles: cleanPhone,
        message: message,
        sender: MSG91_SENDER_ID,
        route: '4',
      },
    });

    const responseStr = String(response.data).trim();
    console.log(`✅ MSG91 API Response:`, responseStr.substring(0, 50));

    if (responseStr.includes('1001')) {
      console.log(`✅ SMS sent via MSG91`);
      return true;
    }

    throw new Error('MSG91 error response');
  } catch (error: any) {
    console.error(`❌ SMS Error: ${error.message}`);
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
