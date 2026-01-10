import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

let twilioClient: twilio.Twilio | null = null;

const getTwilioClient = () => {
  if (!twilioClient && accountSid) {
    // Method 1: Use API Key (recommended - more secure)
    if (apiKeySid && apiKeySecret) {
      twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
      console.log('✅ Twilio initialized with API Key');
    }
    // Method 2: Use Auth Token (traditional)
    else if (authToken) {
      twilioClient = twilio(accountSid, authToken);
      console.log('✅ Twilio initialized with Auth Token');
    }
  }
  return twilioClient;
};

/**
 * Send OTP via Twilio Verify Service (recommended for trial accounts)
 * Works on free trial - no verified number requirement
 * @param phone - 10-digit phone number
 * @param otp - 6-digit OTP code (stored in DB)
 * @returns Success status
 */
export const sendOTPviaVerifyService = async (phone: string, otp?: string): Promise<boolean> => {
  try {
    const client = getTwilioClient();
    
    if (!client) {
      console.log('❌ Twilio client not initialized');
      console.log(`📱 [CONSOLE] OTP for ${phone}: ${otp || 'pending'}`);
      return true;
    }
    
    if (!verifyServiceSid) {
      console.log('⚠️  TWILIO_VERIFY_SERVICE_SID not set. Using SMS/console fallback');
      console.log(`📱 [CONSOLE] OTP for ${phone}: ${otp || 'pending'}`);
      return true;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    console.log(`📱 Sending via Verify Service (SID: ${verifyServiceSid.substring(0, 8)}...)`);
    console.log(`📱 Phone: ${formattedPhone}`);
    
    // Send code via Verify Service - Trial account supports SMS
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms',
      });

    console.log(`✅ Verify Service OTP request sent - SID: ${verification.sid}`);
    console.log(`✅ Status: ${verification.status}`);
    console.log(`📝 Check your phone at ${formattedPhone} for OTP`);
    return true;
    
  } catch (error: any) {
    const errorCode = error.code || error.status || 'UNKNOWN';
    const errorMsg = error.message || 'Unknown error';
    
    console.error(`❌ Verify Service error (${errorCode}): ${errorMsg}`);
    
    // Log OTP for console fallback
    console.log(`\n📱 [FALLBACK MODE] OTP for manual testing:`);
    console.log(`   Phone: ${phone}`);
    console.log(`   OTP: ${otp}`);
    console.log(`   ↳ Use this OTP in the frontend form\n`);
    
    // Common trial account errors
    if (errorCode === '20003') {
      console.log('ℹ️  Error 20003: Authentication failed - Check TWILIO_VERIFY_SERVICE_SID');
    } else if (errorCode === '21608') {
      console.log('ℹ️  Error 21608: Invalid phone format - Ensure +91 country code');
    } else if (errorCode === '20429') {
      console.log('ℹ️  Error 20429: Rate limited - Wait before retrying');
    }
    
    // Allow auth flow to continue - OTP is in database anyway
    return true;
  }
};

/**
 * Store OTP in memory for testing (development only)
 * In production, this is stored in database via auth controller
 */
const otpStore = new Map<string, { code: string; expiresAt: number }>();

/**
 * Store OTP for development/testing (console-based verification)
 */
export const storeOTPForTesting = (phone: string, code: string) => {
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min expiry
};

/**
 * Verify OTP from memory store (development/testing)
 */
export const verifyOTPFromStore = (phone: string, code: string): boolean => {
  const stored = otpStore.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  return stored.code === code;
};

/**
 * Verify OTP code via Twilio Verify Service
 * @param phone - 10-digit phone number
 * @param code - 6-digit OTP code to verify
 * @returns Success status
 */
export const verifyOTPCode = async (phone: string, code: string): Promise<boolean> => {
  try {
    const client = getTwilioClient();
    
    // If Verify Service configured, try to verify via Twilio
    if (client && verifyServiceSid) {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      try {
        const verificationCheck = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
          to: formattedPhone,
          code,
        });

        if (verificationCheck.status === 'approved') {
          console.log(`✅ OTP verified for ${formattedPhone} via Verify Service`);
          return true;
        }
      } catch (verifyError: any) {
        console.log(`⚠️  Verify Service check failed: ${verifyError.message}`);
        // Fall through to manual verification
      }
    }
    
    // Fallback: Check from in-memory store (for development/console OTP)
    if (verifyOTPFromStore(phone, code)) {
      console.log(`✅ OTP verified for ${phone} from console/manual store`);
      return true;
    }
    
    console.log(`❌ Invalid OTP for ${phone}`);
    return false;
  } catch (error: any) {
    console.error('❌ OTP verification error:', error.message);
    // Still allow if stored OTP matches
    return verifyOTPFromStore(phone, code);
  }
};

/**
 * Send OTP via SMS using Twilio
 * @param phone - 10-digit phone number
 * @param otp - 6-digit OTP code
 * @returns Success status
 */
export const sendOTPviaSMS = async (phone: string, otp: string): Promise<boolean> => {
  try {
    const client = getTwilioClient();
    
    if (!client || !twilioPhone) {
      console.log('📱 Twilio SMS not configured. OTP:', otp, 'for phone:', phone);
      return true; // Return true so auth flow continues
    }

    // Format phone number with country code
    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const message = await client.messages.create({
      body: `Your Insurance Book OTP is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      from: twilioPhone,
      to: formattedPhone,
    });

    console.log(`✅ SMS sent to ${formattedPhone}, SID: ${message.sid}`);
    return true;
  } catch (error: any) {
    console.error('❌ SMS sending failed:', error.message);
    
    // Log OTP for development/testing (ALWAYS log for fallback)
    console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp}`);
    console.log(`ℹ️  SMS error: ${error.message} - Using fallback mode`);
    
    // Always return true - allow auth to continue
    // OTP is already saved in database
    // In production, setup proper error handling after trial upgrade
    return true;
  }
};

/**
 * Send welcome SMS to new agent
 * @param phone - Agent's phone number
 * @param name - Agent's name
 * @param agentCode - Generated agent code
 */
export const sendWelcomeSMS = async (phone: string, name: string, agentCode: string): Promise<void> => {
  try {
    const client = getTwilioClient();
    
    if (!client || !twilioPhone) {
      console.log(`📱 Welcome SMS skipped (Twilio not configured) for ${name}`);
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    await client.messages.create({
      body: `Welcome to Insurance Book, ${name}! Your Agent Code: ${agentCode}. Start your 60-day free trial now. Login at insurancebook.vercel.app`,
      from: twilioPhone,
      to: formattedPhone,
    });

    console.log(`✅ Welcome SMS sent to ${name}`);
  } catch (error: any) {
    console.error('❌ Welcome SMS failed:', error.message);
    // Don't throw - welcome SMS is not critical
  }
};

/**
 * Send renewal reminder SMS to client
 * @param phone - Client's phone number
 * @param clientName - Client's name
 * @param policyNumber - Policy number
 * @param daysLeft - Days until expiry
 * @param agentPhone - Agent's phone for contact
 */
export const sendRenewalReminderSMS = async (
  phone: string,
  clientName: string,
  policyNumber: string,
  daysLeft: number,
  agentPhone?: string
): Promise<void> => {
  try {
    const client = getTwilioClient();
    
    if (!client || !twilioPhone || !phone) {
      return;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    let message = `Hi ${clientName}, your policy ${policyNumber} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.`;
    if (agentPhone) {
      message += ` Contact your agent at ${agentPhone} for renewal.`;
    }
    message += ' - Insurance Book';

    await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone,
    });

    console.log(`✅ Renewal reminder sent to ${clientName}`);
  } catch (error: any) {
    console.error('❌ Renewal SMS failed:', error.message);
  }
};
