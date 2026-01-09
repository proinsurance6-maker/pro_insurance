import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Extract policy details from document image using OpenAI Vision API
 * @param imageBase64 - Base64 encoded image data
 * @param mimeType - MIME type of the image (image/jpeg, image/png, etc.)
 * @returns Extracted policy data
 */
export const extractPolicyFromImage = async (
  imageBase64: string,
  mimeType: string
): Promise<ExtractedPolicyData> => {
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured in environment');
  }

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
    
    if (error.message?.includes('API key')) {
      throw new Error('Invalid OpenAI API key. Please check OPENAI_API_KEY in .env');
    }
    
    if (error.message?.includes('rate limit')) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    }

    throw new Error(`Failed to extract data from document: ${error.message}`);
  }
};

/**
 * Extract text from PDF using OpenAI (converts first page)
 * Note: For multi-page PDFs, consider using pdf-to-image conversion
 */
export const extractPolicyFromPDF = async (
  pdfBuffer: Buffer
): Promise<ExtractedPolicyData> => {
  // For PDFs, we'll use a simpler text extraction approach
  // OpenAI Vision works better with images
  // In production, convert PDF to image first using pdf-poppler or similar
  
  throw new Error('PDF support requires pdf-to-image conversion. Please upload an image (JPG, PNG) of the policy document.');
};
