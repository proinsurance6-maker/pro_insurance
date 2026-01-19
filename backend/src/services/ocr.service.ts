import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize OpenAI client (if key exists)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize Gemini client (if key exists)
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

interface ExtractedPolicyData {
  policyNumber: string | null;
  holderName: string | null;
  policyType: string | null;
  motorPolicyType: string | null; // COMPREHENSIVE, OD_ONLY, TP_ONLY
  policySource: string | null; // FRESH, RENEWAL, PORT
  policyPeriod: string | null; // e.g., "5 Years", "1 Year"
  companyName: string | null;
  premiumAmount: number | null;
  // Motor premium breakdown
  odPremium: number | null;
  tpPremium: number | null;
  netPremium: number | null;
  sumAssured: string | null; // Changed to string to support "Unlimited"
  startDate: string | null;
  endDate: string | null;
  vehicleNumber: string | null;
  planName: string | null;
}

/**
 * Extract policy details from document image with fallback support
 * Tries OpenAI first, then falls back to Gemini if available
 * @param imageBase64 - Base64 encoded image data
 * @param mimeType - MIME type of the image (image/jpeg, image/png, etc.)
 * @returns Extracted policy data
 */
export const extractPolicyFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<ExtractedPolicyData> => {
  
  // Try OpenAI first if available
  if (openai && process.env.OPENAI_API_KEY) {
    try {
      return await extractWithOpenAI(imageBase64, mimeType);
    } catch (error: any) {
      console.error('OpenAI failed:', error.message);
      // If quota exceeded or API key issue, try Gemini
      if (gemini && process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini...');
        return await extractWithGemini(imageBase64, mimeType);
      }
      throw error;
    }
  }
  
  // Try Gemini if OpenAI not available
  if (gemini && process.env.GEMINI_API_KEY) {
    return await extractWithGemini(imageBase64, mimeType);
  }
  
  throw new Error('No AI API keys configured. Please add OPENAI_API_KEY or GEMINI_API_KEY to environment.');
};

/**
 * Extract using OpenAI Vision API
 */
const extractWithOpenAI = async (
  imageBase64: string,
  mimeType: string
): Promise<ExtractedPolicyData> => {

  const prompt = `You are an expert Indian insurance document analyzer with deep knowledge of policy formats from all major Indian insurers (Reliance, National Insurance, TATA AIG, ICICI Lombard, HDFC ERGO, Bajaj Allianz, etc).

CRITICAL: Carefully read ALL text, tables, and sections in this insurance document. Pay special attention to:
- Policy schedule tables
- Premium breakup tables  
- Vehicle/insured details sections
- Policy period/validity sections
- Header and footer information

Extract data and return ONLY a valid JSON object with these exact keys (use null if not found):

{
  "policyNumber": "Policy number/certificate number (look for: 'Policy No', 'Policy Number', 'Certificate No', 'Certificate Number')",
  "holderName": "Full name of policy holder (look for: 'Name of the Insured', 'Proposer Name', 'Insured Person', 'Policy Holder', 'Name of the Proposer', 'Member 1' name)",
  "policyType": "Insurance type: 'Travel Insurance' for travel policies, 'Motor Insurance' for vehicle/car policies, 'Health Insurance' for health/medical",
  "motorPolicyType": "For Motor only: 'COMPREHENSIVE' for package/bundled OD+TP, 'OD_ONLY' for standalone own damage, 'TP_ONLY' for liability only",
  "companyName": "FULL company name from header/logo (e.g., 'Reliance General Insurance', 'National Insurance Company Ltd', 'TATA AIG')",
  "premiumAmount": "TOTAL premium payable - the final amount (look for: 'Total Premium', 'NET PAYABLE', 'Gross Premium', 'Total Amount Payable', 'TOTAL PREMIUM' - remove ₹/Rs, return number only)",
  "odPremium": "Own Damage premium for Motor (look for: 'Basic OD Premium', 'OD Total', 'Total OD Premium' in premium breakup table)",
  "tpPremium": "Third Party premium for Motor (look for: 'Basic TP Premium', 'TP Total', 'Total TP Premium', 'Liability Premium' in premium breakup table)",
  "netPremium": "Net premium before GST (look for: 'Net Premium', 'Total Premium before tax/GST')",
  "sumAssured": "Sum insured/IDV value (for Motor look for 'IDV' in vehicle details, for Health/Travel look for coverage amount or 'Sum Insured')",
  "startDate": "Policy START date in YYYY-MM-DD format",
  "endDate": "Policy END/EXPIRY date in YYYY-MM-DD format",
  "vehicleNumber": "Vehicle registration number for Motor (look in 'Vehicle Details', format: HR-06-AN-7813, MH01AB1234, etc)",
  "planName": "Policy plan/product name (e.g., 'Travel Care Policy', 'Private Car 1 Year Liability', 'Silver Plan')"
}

🔴 CRITICAL DATE EXTRACTION RULES:
1. Policy Period section shows: "From DD/MM/YYYY Hrs on DD/MM/YYYY To DD/MM/YYYY" 
   - First date after "From" = startDate
   - Date after "To" = endDate
2. Example: "From 00:00 Hrs on 15/02/2026 To 14/02/2028 midnight" → startDate: 2026-02-15, endDate: 2028-02-14
3. Convert dates: DD/MM/YYYY → YYYY-MM-DD, DD-Mon-YYYY → YYYY-MM-DD
4. IGNORE these dates: "Policy Issue Date", "Date of Birth", "Login Date", "Transaction Date"
5. For "Policy Period" look for complete text like "From...To" format

🔴 PREMIUM EXTRACTION RULES (Indian Insurance Format):
1. For TOTAL PREMIUM: Look at bottom of premium table - "Total Premium", "NET PAYABLE", "Total Amount Payable"
2. For Motor OD Premium: In "OD Premium Breakup" section, find row "OD Total (Rounded Off)" or "Basic OD Premium"  
3. For Motor TP Premium: In "TP Premium Breakup" section, find "TP Total (Rounded Off)" or "Basic TP Premium"
4. Remove ALL ₹, Rs, INR symbols and commas - return clean number (e.g., ₹4,108 → 4108)

🔴 VEHICLE DETAILS (Motor Insurance):
1. Registration No/Reg No in "Vehicle Details" section
2. Format: State(2) + District(2) + Letters + Numbers (e.g., HR-06-AN-7813)

🔴 COMPANY NAME:
1. Look at header/top of document for full company name
2. Common formats: "Reliance General Insurance Co. Ltd", "National Insurance Company Ltd", "The Oriental Insurance Company Ltd"

Scan tables carefully - premium details are usually in tabular format with multiple rows and columns.`;

  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    // Log raw AI response for debugging
    console.log('🤖 OpenAI Raw Response:', content);
    
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse and validate the response
    const extracted = JSON.parse(jsonStr.trim());
    
    console.log('✅ Extracted Data:', extracted);

    return {
      policyNumber: extracted.policyNumber || null,
      holderName: extracted.holderName || null,
      policyType: extracted.policyType || null,
      motorPolicyType: extracted.motorPolicyType || null,
      policySource: extracted.policySource || null,
      policyPeriod: extracted.policyPeriod || null,
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? String(extracted.sumAssured) : null,
      startDate: extracted.startDate || null,
      endDate: extracted.endDate || null,
      vehicleNumber: extracted.vehicleNumber || null,
      planName: extracted.planName || null,
    };
  } catch (error: any) {
    console.error('OpenAI Vision API Error:', error.message);
    throw new Error(`OpenAI extraction failed: ${error.message}`);
  }
};

/**
 * Extract using Google Gemini Vision API
 */
const extractWithGemini = async (
  imageBase64: string,
  mimeType: string
): Promise<ExtractedPolicyData> => {
  
  const prompt = `You are an expert Indian insurance document analyzer with deep knowledge of policy formats from all major Indian insurers (Reliance, National Insurance, TATA AIG, ICICI Lombard, HDFC ERGO, Bajaj Allianz, etc).

CRITICAL: Carefully read ALL text, tables, and sections in this insurance document. Pay special attention to:
- Policy schedule tables
- Premium breakup tables  
- Vehicle/insured details sections
- Policy period/validity sections
- Header and footer information

Extract data and return ONLY a valid JSON object with these exact keys (use null if not found):

{
  "policyNumber": "Policy number/certificate number (look for: 'Policy No', 'Policy Number', 'Certificate No', 'Certificate Number')",
  "holderName": "Full name of policy holder (look for: 'Name of the Insured', 'Proposer Name', 'Insured Person', 'Policy Holder', 'Name of the Proposer', 'Member 1' name)",
  "policyType": "Insurance type: 'Travel Insurance' for travel policies, 'Motor Insurance' for vehicle/car policies, 'Health Insurance' for health/medical",
  "motorPolicyType": "For Motor only: 'COMPREHENSIVE' for package/bundled OD+TP, 'OD_ONLY' for standalone own damage, 'TP_ONLY' for liability only",
  "policySource": "DETECT: 'PORT' if ported, 'RENEWAL' if renewal, 'FRESH' for new policy",
  "policyPeriod": "Duration (e.g., '1 Year', '5 Years')",
  "companyName": "FULL company name from header/logo (e.g., 'Reliance General Insurance', 'National Insurance Company Ltd', 'TATA AIG')",
  "premiumAmount": "TOTAL premium payable - the final amount (look for: 'Total Premium', 'NET PAYABLE', 'Gross Premium', 'Total Amount Payable', 'TOTAL PREMIUM' - remove ₹/Rs, return number only)",
  "odPremium": "Own Damage premium for Motor (look for: 'Basic OD Premium', 'OD Total', 'Total OD Premium' in premium breakup table)",
  "tpPremium": "Third Party premium for Motor (look for: 'Basic TP Premium', 'TP Total', 'Total TP Premium', 'Liability Premium' in premium breakup table)",
  "netPremium": "Net premium before GST (look for: 'Net Premium', 'Total Premium before tax/GST')",
  "sumAssured": "Sum insured/IDV value (for Motor look for 'IDV' in vehicle details, for Health/Travel look for coverage amount or 'Sum Insured')",
  "startDate": "Policy START date in YYYY-MM-DD format",
  "endDate": "Policy END/EXPIRY date in YYYY-MM-DD format",
  "vehicleNumber": "Vehicle registration number for Motor (look in 'Vehicle Details', format: HR-06-AN-7813, MH01AB1234, etc)",
  "planName": "Policy plan/product name (e.g., 'Travel Care Policy', 'Private Car 1 Year Liability', 'Silver Plan')"
}

🔴 CRITICAL DATE EXTRACTION RULES:
1. Policy Period section shows: "From DD/MM/YYYY Hrs on DD/MM/YYYY To DD/MM/YYYY" 
   - First date after "From" = startDate
   - Date after "To" = endDate
2. Example: "From 00:00 Hrs on 15/02/2026 To 14/02/2028 midnight" → startDate: 2026-02-15, endDate: 2028-02-14
3. Convert dates: DD/MM/YYYY → YYYY-MM-DD, DD-Mon-YYYY → YYYY-MM-DD
4. IGNORE these dates: "Policy Issue Date", "Date of Birth", "Login Date", "Transaction Date"
5. For "Policy Period" look for complete text like "From...To" format

🔴 PREMIUM EXTRACTION RULES (Indian Insurance Format):
1. For TOTAL PREMIUM: Look at bottom of premium table - "Total Premium", "NET PAYABLE", "Total Amount Payable"
2. For Motor OD Premium: In "OD Premium Breakup" section, find row "OD Total (Rounded Off)" or "Basic OD Premium"  
3. For Motor TP Premium: In "TP Premium Breakup" section, find "TP Total (Rounded Off)" or "Basic TP Premium"
4. Remove ALL ₹, Rs, INR symbols and commas - return clean number (e.g., ₹4,108 → 4108)

🔴 VEHICLE DETAILS (Motor Insurance):
1. Registration No/Reg No in "Vehicle Details" section
2. Format: State(2) + District(2) + Letters + Numbers (e.g., HR-06-AN-7813)

🔴 COMPANY NAME:
1. Look at header/top of document for full company name
2. Common formats: "Reliance General Insurance Co. Ltd", "National Insurance Company Ltd", "The Oriental Insurance Company Ltd"

Scan tables carefully - premium details are usually in tabular format with multiple rows and columns.`;

  try {
    const model = gemini!.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);

    const response = await result.response;
    const content = response.text();
    
    // Log raw AI response for debugging
    console.log('🤖 Gemini Raw Response:', content);
    
    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extracted = JSON.parse(jsonStr.trim());
    
    console.log('✅ Gemini Extracted Data:', extracted);

    return {
      policyNumber: extracted.policyNumber || null,
      holderName: extracted.holderName || null,
      policyType: extracted.policyType || null,
      motorPolicyType: extracted.motorPolicyType || null,
      policySource: extracted.policySource || null,
      policyPeriod: extracted.policyPeriod || null,
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? String(extracted.sumAssured) : null,
      startDate: extracted.startDate || null,
      endDate: extracted.endDate || null,
      vehicleNumber: extracted.vehicleNumber || null,
      planName: extracted.planName || null,
    };
  } catch (error: any) {
    console.error('Gemini Vision API Error:', error.message);
    throw new Error(`Gemini extraction failed: ${error.message}`);
  }
};

/**
 * Original OpenAI error handling (kept for reference)
 */
const handleOpenAIError = (error: any) => {
  if (error.message?.includes('API key')) {
    throw new Error('Invalid OpenAI API key. Please check OPENAI_API_KEY in .env');
  }
  
  if (error.message?.includes('rate limit')) {
    throw new Error('OpenAI rate limit exceeded. Please try again later.');
  }

  throw new Error(`Failed to extract data from document: ${error.message}`);
};

/**
 * Extract policy details from PDF text with fallback support
 * @param pdfText - Extracted text from PDF
 * @returns Extracted policy data
 */
export const extractPolicyFromText = async (
  pdfText: string
): Promise<ExtractedPolicyData> => {
  
  // Try OpenAI first if available
  if (openai && process.env.OPENAI_API_KEY) {
    try {
      return await extractTextWithOpenAI(pdfText);
    } catch (error: any) {
      console.error('OpenAI text extraction failed:', error.message);
      // Fallback to Gemini
      if (gemini && process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini for text extraction...');
        return await extractTextWithGemini(pdfText);
      }
      throw error;
    }
  }
  
  // Try Gemini if OpenAI not available
  if (gemini && process.env.GEMINI_API_KEY) {
    return await extractTextWithGemini(pdfText);
  }
  
  throw new Error('No AI API keys configured. Please add OPENAI_API_KEY or GEMINI_API_KEY.');
};

const extractTextWithOpenAI = async (pdfText: string): Promise<ExtractedPolicyData> => {

  const prompt = `You are an expert insurance document analyzer for Indian insurance policies. Carefully analyze this insurance policy document text and extract ALL details.

Document Text:
${pdfText.substring(0, 8000)} 

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID (look for 'Policy No', 'Policy Number', 'Certificate No')",
  "holderName": "name of the policy holder/insured person",
  "policyType": "return 'Motor Insurance' for any vehicle/car/bike policy",
  "motorPolicyType": "'OD_ONLY' for Standalone Own Damage, 'TP_ONLY' for Third Party Only, 'COMPREHENSIVE' for Package/Comprehensive",
  "companyName": "FULL company name (e.g., 'TATA AIG General Insurance Company Limited')",
  "premiumAmount": total premium payable (Total Amount Payable, Gross Premium),
  "odPremium": OD/Own Damage premium (Total Own Damage Premium, Section A total),
  "tpPremium": TP/Third Party premium (TP Premium, Liability Premium),
  "netPremium": Net premium before GST (Net Premium A+B, Premium before tax),
  "sumAssured": IDV or Sum Insured value,
  "startDate": "policy START date in YYYY-MM-DD format",
  "endDate": "policy END/EXPIRY date in YYYY-MM-DD format",
  "vehicleNumber": "Registration No like 'UP 16 EC 5046'",
  "planName": "plan name if mentioned"
}

CRITICAL DATE EXTRACTION RULES:
1. startDate = Policy START date (look for: 'Policy Start Date', 'Valid From', 'Period From', 'Risk Commencement Date', 'From')
2. endDate = Policy END/EXPIRY date (look for: 'Policy End Date', 'Valid Till', 'Valid Upto', 'Expiry Date', 'Period To', 'To')
3. IGNORE 'Login Date', 'Issue Date', 'Date of Issue', 'Transaction Date' - these are NOT start/end dates
4. Convert DD/MM/YYYY or DD-MMM-YYYY to YYYY-MM-DD format

OTHER RULES:
1. VEHICLE NUMBER: Find 'Registration No' - format STATE+DISTRICT+LETTERS+NUMBERS (UP 16 EC 5046)
2. OD PREMIUM: Find 'Total Own Damage Premium' amount in Schedule of Premium
3. NET PREMIUM: Find 'Net Premium (A+B)' or total before GST
4. Remove ₹, Rs, INR from amounts
5. 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY`;

  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extracted = JSON.parse(jsonStr.trim());

    return {
      policyNumber: extracted.policyNumber || null,
      holderName: extracted.holderName || null,
      policyType: extracted.policyType || null,
      motorPolicyType: extracted.motorPolicyType || null,
      policySource: extracted.policySource || null,
      policyPeriod: extracted.policyPeriod || null,
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? String(extracted.sumAssured) : null,
      startDate: extracted.startDate || null,
      endDate: extracted.endDate || null,
      vehicleNumber: extracted.vehicleNumber || null,
      planName: extracted.planName || null,
    };
  } catch (error: any) {
    console.error('OpenAI text extraction error:', error.message);
    throw new Error(`OpenAI text extraction failed: ${error.message}`);
  }
};

const extractTextWithGemini = async (pdfText: string): Promise<ExtractedPolicyData> => {
  const prompt = `You are an expert insurance document analyzer for Indian insurance policies. Carefully analyze this insurance policy document text and extract ALL details.

Document Text:
${pdfText.substring(0, 8000)} 

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID (look for 'Policy No', 'Policy Number', 'Certificate No')",
  "holderName": "name of the policy holder/insured person",
  "policyType": "return 'Motor Insurance' for any vehicle/car/bike policy",
  "motorPolicyType": "'OD_ONLY' for Standalone Own Damage, 'TP_ONLY' for Third Party Only, 'COMPREHENSIVE' for Package/Comprehensive",
  "companyName": "FULL company name (e.g., 'TATA AIG General Insurance Company Limited')",
  "premiumAmount": total premium payable (Total Amount Payable, Gross Premium),
  "odPremium": OD/Own Damage premium (Total Own Damage Premium, Section A total),
  "tpPremium": TP/Third Party premium (TP Premium, Liability Premium),
  "netPremium": Net premium before GST (Net Premium A+B, Premium before tax),
  "sumAssured": IDV or Sum Insured value,
  "startDate": "policy START date in YYYY-MM-DD format",
  "endDate": "policy END/EXPIRY date in YYYY-MM-DD format",
  "vehicleNumber": "Registration No like 'UP 16 EC 5046'",
  "planName": "plan name if mentioned"
}

CRITICAL DATE EXTRACTION RULES:
1. startDate = Policy START date (look for: 'Policy Start Date', 'Valid From', 'Period From', 'Risk Commencement Date', 'From')
2. endDate = Policy END/EXPIRY date (look for: 'Policy End Date', 'Valid Till', 'Valid Upto', 'Expiry Date', 'Period To', 'To')
3. IGNORE 'Login Date', 'Issue Date', 'Date of Issue', 'Transaction Date' - these are NOT start/end dates
4. Convert DD/MM/YYYY or DD-MMM-YYYY to YYYY-MM-DD format

OTHER RULES:
1. VEHICLE NUMBER: Find 'Registration No' - format STATE+DISTRICT+LETTERS+NUMBERS (UP 16 EC 5046)
2. OD PREMIUM: Find 'Total Own Damage Premium' amount in Schedule of Premium
3. NET PREMIUM: Find 'Net Premium (A+B)' or total before GST
4. Remove ₹, Rs, INR from amounts
5. 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY`;

  try {
    const model = gemini!.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const extracted = JSON.parse(jsonStr.trim());

    return {
      policyNumber: extracted.policyNumber || null,
      holderName: extracted.holderName || null,
      policyType: extracted.policyType || null,
      motorPolicyType: extracted.motorPolicyType || null,
      policySource: extracted.policySource || null,
      policyPeriod: extracted.policyPeriod || null,
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? String(extracted.sumAssured) : null,
      startDate: extracted.startDate || null,
      endDate: extracted.endDate || null,
      vehicleNumber: extracted.vehicleNumber || null,
      planName: extracted.planName || null,
    };
  } catch (error: any) {
    console.error('Gemini text extraction error:', error.message);
    throw new Error(`Gemini text extraction failed: ${error.message}`);
  }
};

/**
 * Deprecated - kept for compatibility
 */
export const extractPolicyFromPDF = async (
  pdfBuffer: Buffer
): Promise<ExtractedPolicyData> => {
  throw new Error('Use extractPolicyFromText instead');
};
