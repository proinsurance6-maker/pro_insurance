import prisma from '../utils/prisma';
import { sendEmail } from '../services/email.service';

export const checkAndSendRenewalReminders = async () => {
  const today = new Date();
  const date30 = new Date(today);
  const date15 = new Date(today);
  const date7 = new Date(today);
  const date1 = new Date(today);

  date30.setDate(date30.getDate() + 30);
  date15.setDate(date15.getDate() + 15);
  date7.setDate(date7.getDate() + 7);
  date1.setDate(date1.getDate() + 1);

  // Helper function to normalize dates for comparison
  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const normalizedToday = normalizeDate(today);
  const normalized30 = normalizeDate(date30);
  const normalized15 = normalizeDate(date15);
  const normalized7 = normalizeDate(date7);
  const normalized1 = normalizeDate(date1);

  // Find renewals for each period
  const renewals30Days = await prisma.renewal.findMany({
    where: {
      renewalDate: normalized30,
      reminder30DaysSent: false,
      renewalStatus: 'pending',
    },
    include: {
      policy: {
        include: {
          company: true,
          subBroker: true,
        },
      },
    },
  });

  const renewals15Days = await prisma.renewal.findMany({
    where: {
      renewalDate: normalized15,
      reminder15DaysSent: false,
      renewalStatus: 'pending',
    },
    include: {
      policy: {
        include: {
          company: true,
          subBroker: true,
        },
      },
    },
  });

  const renewals7Days = await prisma.renewal.findMany({
    where: {
      renewalDate: normalized7,
      reminder7DaysSent: false,
      renewalStatus: 'pending',
    },
    include: {
      policy: {
        include: {
          company: true,
          subBroker: true,
        },
      },
    },
  });

  const renewals1Day = await prisma.renewal.findMany({
    where: {
      renewalDate: normalized1,
      reminder1DaySent: false,
      renewalStatus: 'pending',
    },
    include: {
      policy: {
        include: {
          company: true,
          subBroker: true,
        },
      },
    },
  });

  // Send reminders for 30 days
  for (const renewal of renewals30Days) {
    await sendRenewalEmail(renewal, 30);
    await prisma.renewal.update({
      where: { id: renewal.id },
      data: {
        reminder30DaysSent: true,
        reminder30DaysSentAt: new Date(),
      },
    });
  }

  // Send reminders for 15 days
  for (const renewal of renewals15Days) {
    await sendRenewalEmail(renewal, 15);
    await prisma.renewal.update({
      where: { id: renewal.id },
      data: {
        reminder15DaysSent: true,
        reminder15DaysSentAt: new Date(),
      },
    });
  }

  // Send reminders for 7 days
  for (const renewal of renewals7Days) {
    await sendRenewalEmail(renewal, 7);
    await prisma.renewal.update({
      where: { id: renewal.id },
      data: {
        reminder7DaysSent: true,
        reminder7DaysSentAt: new Date(),
      },
    });
  }

  // Send reminders for 1 day
  for (const renewal of renewals1Day) {
    await sendRenewalEmail(renewal, 1);
    await prisma.renewal.update({
      where: { id: renewal.id },
      data: {
        reminder1DaySent: true,
        reminder1DaysSentAt: new Date(),
      },
    });
  }

  console.log(`📧 Sent ${renewals30Days.length + renewals15Days.length + renewals7Days.length + renewals1Day.length} renewal reminders`);
};

const sendRenewalEmail = async (renewal: any, daysRemaining: number) => {
  const { policy } = renewal;

  await sendEmail({
    to: policy.subBroker.email,
    subject: `Policy Renewal Reminder - ${policy.policyNumber}`,
    html: `
      <h2>Policy Renewal Reminder</h2>
      <p>Dear ${policy.subBroker.name},</p>
      
      <p>This is a reminder that the following policy is due for renewal in <strong>${daysRemaining} days</strong>:</p>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Policy Number:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${policy.policyNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Customer Name:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${policy.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${policy.company.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Policy Type:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${policy.policyType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Premium Amount:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">₹${policy.premiumAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Renewal Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date(renewal.renewalDate).toLocaleDateString()}</td>
        </tr>
      </table>
      
      <p>Please contact the customer to process the renewal.</p>
      
      <p>Best regards,<br>Insurance Management Team</p>
    `,
  });
};
