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
  companyName: string | null;
  premiumAmount: number | null;
  // Motor premium breakdown
  odPremium: number | null;
  tpPremium: number | null;
  netPremium: number | null;
  sumAssured: number | null;
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

  const prompt = `You are an expert insurance document analyzer for Indian insurance policies. Carefully analyze ALL pages of this insurance policy document and extract EVERY detail.

IMPORTANT: Scan the ENTIRE document thoroughly. Look for tables, schedules, and all sections.

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID (look for 'Policy No', 'Policy Number', 'Certificate No')",
  "holderName": "name of the policy holder/insured person (look for 'Name', 'Insured Name', 'Proposer')",
  "policyType": "type of insurance - return 'Motor Insurance' for any vehicle/car/bike policy",
  "motorPolicyType": "MUST detect: 'OD_ONLY' for Standalone Own Damage, 'TP_ONLY' for Standalone Third Party/Liability Only, 'COMPREHENSIVE' for Package/Comprehensive with both OD and TP",
  "companyName": "FULL insurance company name (e.g., 'TATA AIG General Insurance', 'ICICI Lombard', 'Bajaj Allianz')",
  "premiumAmount": total premium amount payable (look for 'Total Premium', 'Total Amount Payable', 'Gross Premium'),
  "odPremium": OD/Own Damage premium amount (look for 'Total Own Damage Premium', 'OD Premium', 'Section A' premium),
  "tpPremium": TP/Third Party/Liability premium amount (look for 'TP Premium', 'Third Party Premium', 'Liability Premium'),
  "netPremium": Net premium before GST (look for 'Net Premium', 'Premium before tax', usually OD+TP or basic premium),
  "sumAssured": IDV or Sum Insured value (look for 'IDV', 'Insured Declared Value', 'Sum Insured', 'Sum Assured'),
  "startDate": "policy start date in YYYY-MM-DD format (look for 'Valid From', 'Start Date', 'Period From')",
  "endDate": "policy end date in YYYY-MM-DD format (look for 'Valid Till', 'Expiry Date', 'Valid Upto')",
  "vehicleNumber": "vehicle registration number (look for 'Registration No', 'Reg No', 'Vehicle No' - format like 'UP 16 EC 5046' or 'MH01AB1234')",
  "planName": "policy plan name if mentioned"
}

CRITICAL EXTRACTION RULES:
1. For VEHICLE NUMBER: Look in 'Vehicle Details' section. Format is usually STATE CODE + DISTRICT + LETTERS + NUMBERS (e.g., UP 16 EC 5046)
2. For OD PREMIUM: In Schedule of Premium, find 'Total Own Damage Premium' or 'Section A' total
3. For NET PREMIUM: Find 'Net Premium (A+B)' or 'Premium before GST/Tax'
4. For COMPANY NAME: Look at header/logo area - extract FULL name like 'TATA AIG General Insurance Company'
5. For DATES: Convert DD/MM/YYYY to YYYY-MM-DD format
6. For motorPolicyType: If title says 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY, 'Comprehensive/Package' → COMPREHENSIVE
7. Remove ALL currency symbols (₹, Rs, INR) - return ONLY numbers

Be thorough - scan every table and section in the document.`;

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
    
    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse and validate the response
    const extracted = JSON.parse(jsonStr.trim());

    return {
      policyNumber: extracted.policyNumber || null,
      holderName: extracted.holderName || null,
      policyType: extracted.policyType || null,
      motorPolicyType: extracted.motorPolicyType || null,
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? Number(extracted.sumAssured) : null,
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
  
  const prompt = `You are an expert insurance document analyzer for Indian insurance policies. Carefully analyze ALL pages of this insurance policy document and extract EVERY detail.

IMPORTANT: Scan the ENTIRE document thoroughly. Look for tables, schedules, and all sections.

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID (look for 'Policy No', 'Policy Number', 'Certificate No')",
  "holderName": "name of the policy holder/insured person (look for 'Name', 'Insured Name', 'Proposer')",
  "policyType": "type of insurance - return 'Motor Insurance' for any vehicle/car/bike policy",
  "motorPolicyType": "MUST detect: 'OD_ONLY' for Standalone Own Damage, 'TP_ONLY' for Standalone Third Party/Liability Only, 'COMPREHENSIVE' for Package/Comprehensive with both OD and TP",
  "companyName": "FULL insurance company name (e.g., 'TATA AIG General Insurance', 'ICICI Lombard', 'Bajaj Allianz')",
  "premiumAmount": total premium amount payable (look for 'Total Premium', 'Total Amount Payable', 'Gross Premium'),
  "odPremium": OD/Own Damage premium amount (look for 'Total Own Damage Premium', 'OD Premium', 'Section A' premium),
  "tpPremium": TP/Third Party/Liability premium amount (look for 'TP Premium', 'Third Party Premium', 'Liability Premium'),
  "netPremium": Net premium before GST (look for 'Net Premium', 'Premium before tax', usually OD+TP or basic premium),
  "sumAssured": IDV or Sum Insured value (look for 'IDV', 'Insured Declared Value', 'Sum Insured', 'Sum Assured'),
  "startDate": "policy start date in YYYY-MM-DD format (look for 'Valid From', 'Start Date', 'Period From')",
  "endDate": "policy end date in YYYY-MM-DD format (look for 'Valid Till', 'Expiry Date', 'Valid Upto')",
  "vehicleNumber": "vehicle registration number (look for 'Registration No', 'Reg No', 'Vehicle No' - format like 'UP 16 EC 5046' or 'MH01AB1234')",
  "planName": "policy plan name if mentioned"
}

CRITICAL EXTRACTION RULES:
1. For VEHICLE NUMBER: Look in 'Vehicle Details' section. Format is usually STATE CODE + DISTRICT + LETTERS + NUMBERS (e.g., UP 16 EC 5046)
2. For OD PREMIUM: In Schedule of Premium, find 'Total Own Damage Premium' or 'Section A' total
3. For NET PREMIUM: Find 'Net Premium (A+B)' or 'Premium before GST/Tax'
4. For COMPANY NAME: Look at header/logo area - extract FULL name like 'TATA AIG General Insurance Company'
5. For DATES: Convert DD/MM/YYYY to YYYY-MM-DD format
6. For motorPolicyType: If title says 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY, 'Comprehensive/Package' → COMPREHENSIVE
7. Remove ALL currency symbols (₹, Rs, INR) - return ONLY numbers

Be thorough - scan every table and section in the document.`;

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
    
    // Extract JSON from response
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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? Number(extracted.sumAssured) : null,
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
  "startDate": "start date in YYYY-MM-DD format",
  "endDate": "end date in YYYY-MM-DD format",
  "vehicleNumber": "Registration No like 'UP 16 EC 5046'",
  "planName": "plan name if mentioned"
}

EXTRACTION RULES:
1. VEHICLE NUMBER: Find 'Registration No' - format STATE+DISTRICT+LETTERS+NUMBERS (UP 16 EC 5046)
2. OD PREMIUM: Find 'Total Own Damage Premium' amount in Schedule of Premium
3. NET PREMIUM: Find 'Net Premium (A+B)' or total before GST
4. Convert DD/MM/YYYY dates to YYYY-MM-DD
5. Remove ₹, Rs, INR from amounts
6. 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? Number(extracted.sumAssured) : null,
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
  "startDate": "start date in YYYY-MM-DD format",
  "endDate": "end date in YYYY-MM-DD format",
  "vehicleNumber": "Registration No like 'UP 16 EC 5046'",
  "planName": "plan name if mentioned"
}

EXTRACTION RULES:
1. VEHICLE NUMBER: Find 'Registration No' - format STATE+DISTRICT+LETTERS+NUMBERS (UP 16 EC 5046)
2. OD PREMIUM: Find 'Total Own Damage Premium' amount in Schedule of Premium
3. NET PREMIUM: Find 'Net Premium (A+B)' or total before GST
4. Convert DD/MM/YYYY dates to YYYY-MM-DD
5. Remove ₹, Rs, INR from amounts
6. 'Standalone Own Damage' → OD_ONLY, 'Standalone TP' → TP_ONLY`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
      odPremium: extracted.odPremium ? Number(extracted.odPremium) : null,
      tpPremium: extracted.tpPremium ? Number(extracted.tpPremium) : null,
      netPremium: extracted.netPremium ? Number(extracted.netPremium) : null,
      sumAssured: extracted.sumAssured ? Number(extracted.sumAssured) : null,
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
