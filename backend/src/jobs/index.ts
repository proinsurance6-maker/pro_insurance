import cron from 'node-cron';
import { checkAndSendRenewalReminders } from './renewalReminder.job';

export const startCronJobs = () => {
  console.log('📅 Starting cron jobs...');

  // Run renewal reminder check daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running renewal reminder job...');
    try {
      await checkAndSendRenewalReminders();
      console.log('✅ Renewal reminder job completed');
    } catch (error) {
      console.error('❌ Renewal reminder job failed:', error);
    }
  });

  console.log('✅ Cron jobs started');
};
