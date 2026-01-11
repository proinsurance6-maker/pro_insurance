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
  companyName: string | null;
  premiumAmount: number | null;
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

  const prompt = `You are an expert insurance document analyzer. Analyze this insurance policy document image and extract the following information.

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID",
  "holderName": "name of the policy holder/insured person",
  "policyType": "type of insurance (Life, Health, Motor, Term, ULIP, etc.)",
  "companyName": "name of the insurance company",
  "premiumAmount": numeric value of premium amount (no currency symbol),
  "sumAssured": numeric value of sum assured/insured (no currency symbol),
  "startDate": "policy start date in YYYY-MM-DD format",
  "endDate": "policy end date/expiry date in YYYY-MM-DD format",
  "vehicleNumber": "vehicle registration number if motor insurance, else null",
  "planName": "name of the insurance plan/scheme if mentioned"
}

Important:
- Extract dates and convert to YYYY-MM-DD format
- Remove currency symbols (₹, Rs, INR) from amounts, return only numbers
- For policy type, standardize to: Life Insurance, Health Insurance, Motor Insurance, Term Insurance, ULIP, Endowment, Money Back, Pension Plan, Child Plan, Travel Insurance, Home Insurance, or Other
- Be accurate - only extract information that is clearly visible in the document`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
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
  
  const prompt = `You are an expert insurance document analyzer. Analyze this insurance policy document image and extract the following information.

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID",
  "holderName": "name of the policy holder/insured person",
  "policyType": "type of insurance (Life, Health, Motor, Term, ULIP, etc.)",
  "companyName": "name of the insurance company",
  "premiumAmount": numeric value of premium amount (no currency symbol),
  "sumAssured": numeric value of sum assured/insured (no currency symbol),
  "startDate": "policy start date in YYYY-MM-DD format",
  "endDate": "policy end date/expiry date in YYYY-MM-DD format",
  "vehicleNumber": "vehicle registration number if motor insurance, else null",
  "planName": "name of the insurance plan/scheme if mentioned"
}

Important:
- Extract dates and convert to YYYY-MM-DD format
- Remove currency symbols (₹, Rs, INR) from amounts, return only numbers
- For policy type, standardize to: Life Insurance, Health Insurance, Motor Insurance, Term Insurance, ULIP, Endowment, Money Back, Pension Plan, Child Plan, Travel Insurance, Home Insurance, or Other
- Be accurate - only extract information that is clearly visible in the document`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
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

  const prompt = `You are an expert insurance document analyzer. Analyze this insurance policy document text and extract the following information.

Document Text:
${pdfText.substring(0, 4000)} 

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID",
  "holderName": "name of the policy holder/insured person",
  "policyType": "type of insurance (Life, Health, Motor, Term, ULIP, etc.)",
  "companyName": "name of the insurance company",
  "premiumAmount": numeric value of premium amount (no currency symbol),
  "sumAssured": numeric value of sum assured/insured (no currency symbol),
  "startDate": "policy start date in YYYY-MM-DD format",
  "endDate": "policy end date/expiry date in YYYY-MM-DD format",
  "vehicleNumber": "vehicle registration number if motor insurance, else null",
  "planName": "name of the insurance plan/scheme if mentioned"
}

Important:
- Extract dates and convert to YYYY-MM-DD format
- Remove currency symbols (₹, Rs, INR) from amounts, return only numbers
- For policy type, standardize to: Life Insurance, Health Insurance, Motor Insurance, Term Insurance, ULIP, Endowment, Money Back, Pension Plan, Child Plan, Travel Insurance, Home Insurance, or Other
- Be accurate - only extract information that is clearly visible in the text`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
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
  const prompt = `You are an expert insurance document analyzer. Analyze this insurance policy document text and extract the following information.

Document Text:
${pdfText.substring(0, 4000)} 

Return ONLY a valid JSON object with these exact keys (use null if not found):
{
  "policyNumber": "the policy number/ID",
  "holderName": "name of the policy holder/insured person",
  "policyType": "type of insurance (Life, Health, Motor, Term, ULIP, etc.)",
  "companyName": "name of the insurance company",
  "premiumAmount": numeric value of premium amount (no currency symbol),
  "sumAssured": numeric value of sum assured/insured (no currency symbol),
  "startDate": "policy start date in YYYY-MM-DD format",
  "endDate": "policy end date/expiry date in YYYY-MM-DD format",
  "vehicleNumber": "vehicle registration number if motor insurance, else null",
  "planName": "name of the insurance plan/scheme if mentioned"
}

Important:
- Extract dates and convert to YYYY-MM-DD format
- Remove currency symbols (₹, Rs, INR) from amounts, return only numbers
- For policy type, standardize to: Life Insurance, Health Insurance, Motor Insurance, Term Insurance, ULIP, Endowment, Money Back, Pension Plan, Child Plan, Travel Insurance, Home Insurance, or Other`;

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
      companyName: extracted.companyName || null,
      premiumAmount: extracted.premiumAmount ? Number(extracted.premiumAmount) : null,
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
