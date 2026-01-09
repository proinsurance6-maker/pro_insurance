import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create transporter based on configuration
const createTransporter = () => {
  // Use SendGrid if API key is available
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }
  
  // Fallback to SMTP configuration
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Gmail fallback
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-password',
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // Skip if no email configuration
    if (!process.env.SENDGRID_API_KEY && !process.env.SMTP_HOST && !process.env.SMTP_USER) {
      console.log('📧 Email skipped (not configured):', options.subject, 'to', options.to);
      return true;
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Insurance Book <noreply@insurancebook.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    
    // Don't throw in development
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    return false;
  }
};

/**
 * Send renewal reminder email
 */
export const sendRenewalReminderEmail = async (
  email: string,
  clientName: string,
  policyNumber: string,
  companyName: string,
  daysLeft: number,
  agentName: string,
  agentPhone: string
): Promise<void> => {
  if (!email) return;

  const urgencyColor = daysLeft <= 1 ? '#dc2626' : daysLeft <= 7 ? '#f59e0b' : '#2563eb';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .badge { display: inline-block; background: ${urgencyColor}; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Policy Renewal Reminder</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${clientName}</strong>,</p>
          
          <p>Your insurance policy is expiring soon:</p>
          
          <div class="details">
            <p><strong>Policy Number:</strong> ${policyNumber}</p>
            <p><strong>Insurance Company:</strong> ${companyName}</p>
            <p><strong>Expires in:</strong> <span class="badge">${daysLeft} day${daysLeft > 1 ? 's' : ''}</span></p>
          </div>
          
          <p>Please contact your agent to renew your policy and ensure continuous coverage.</p>
          
          <div class="details">
            <p><strong>Your Agent:</strong> ${agentName}</p>
            <p><strong>Contact:</strong> ${agentPhone}</p>
          </div>
          
          <p>Best regards,<br>Insurance Book Team</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from Insurance Book.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `⚠️ Policy ${policyNumber} expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} - Renewal Reminder`,
    html
  });
};
