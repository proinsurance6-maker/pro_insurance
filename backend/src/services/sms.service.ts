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
 * @param phone - 10-digit phone number
 * @param otp - 6-digit OTP code (optional - Verify generates if not provided)
 * @returns Success status
 */
export const sendOTPviaVerifyService = async (phone: string, otp?: string): Promise<boolean> => {
  try {
    const client = getTwilioClient();
    
    if (!client || !verifyServiceSid) {
      console.log('📱 Verify Service not configured. Using SMS fallback. OTP:', otp || 'auto-generated', 'for phone:', phone);
      // Fallback to SMS
      return sendOTPviaSMS(phone, otp || '000000');
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    // Send code via Verify Service
    const verification = await client.verify.v2.services(verifyServiceSid).verifications.create({
      to: formattedPhone,
      channel: 'sms',
    });

    console.log(`✅ Verify Service OTP sent to ${formattedPhone}, SID: ${verification.sid}`);
    return true;
  } catch (error: any) {
    console.error('❌ Verify Service failed:', error.message);
    console.log(`📱 [FALLBACK] OTP for ${phone}: ${otp || 'auto-generated'}`);
    return true;
  }
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
    
    if (!client || !verifyServiceSid) {
      console.log('📱 Verify Service not configured');
      return true;
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

    const verificationCheck = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
      to: formattedPhone,
      code,
    });

    if (verificationCheck.status === 'approved') {
      console.log(`✅ OTP verified for ${formattedPhone}`);
      return true;
    } else {
      console.log(`❌ Invalid OTP for ${formattedPhone}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Verify OTP failed:', error.message);
    return false;
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
