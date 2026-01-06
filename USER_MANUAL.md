# User Manual - Insurance Broker Management System

## 📖 Table of Contents

1. [Getting Started](#getting-started)
2. [For Sub-Brokers](#for-sub-brokers)
3. [For Admins](#for-admins)
4. [Common Tasks](#common-tasks)
5. [FAQs](#faqs)

---

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Login credentials from your administrator

### Accessing the System
1. Open your web browser
2. Navigate to: `https://your-app-domain.com`
3. Enter your email and password
4. Click "Login"

### First Time Login
- Admin will provide your credentials
- Default password should be changed immediately
- Contact admin if you forget your password

---

## For Sub-Brokers

### Dashboard Overview

When you login, you'll see your main dashboard with:
- **Total Policies**: Number of active policies
- **Commission Summary**: Total earned, paid, and pending
- **Upcoming Renewals**: Policies expiring soon
- **Recent Policies**: Your latest policies

### Managing Policies

#### Adding a New Policy

1. Click **"Policies"** in the navigation menu
2. Click **"Add Policy"** button
3. Fill in the policy details:
   - Policy Number (unique identifier)
   - Select Insurance Company
   - Customer Information (name, email, phone)
   - Policy Type (Health, Life, Motor, Term)
   - Premium Amount
   - Sum Assured
   - Start Date and End Date
4. Click **"Create Policy"**

**Important Notes:**
- Commission is calculated automatically based on premium amount
- Renewal record is created automatically using the end date
- All fields are required

#### Viewing Policies

1. Click **"Policies"** in the menu
2. Use the search box to find specific policies
3. See all policy details in the table:
   - Policy number
   - Customer name
   - Insurance company
   - Premium amount
   - End date
   - Status (Active/Expired)

#### Searching Policies

Use the search box to find policies by:
- Policy number
- Customer name
- Company name
- Premium amount

### Tracking Commissions

#### Viewing Commission Summary

1. Click **"Commissions"** in the menu
2. View summary cards:
   - **Total Commission**: Lifetime earnings
   - **Paid Commission**: Received payments
   - **Pending Commission**: Awaiting payment

#### Commission History

See detailed table with:
- Policy number
- Customer name
- Company name
- Base amount (premium)
- Commission rate (%)
- Commission amount
- Payment status
- Payment date

### Managing Renewals

#### Viewing Upcoming Renewals

1. Click **"Renewals"** in the menu
2. See three categories:
   - **Upcoming**: Next 30 days
   - **Overdue**: Past expiration date
   - **Renewed**: Already completed

#### Understanding Urgency Badges

- **Red Badge**: 7 days or less (High Priority)
- **Orange Badge**: 8-15 days (Medium Priority)
- **Yellow Badge**: 16-30 days (Low Priority)

#### Marking Policy as Renewed

1. Find the policy in renewals list
2. Click **"Mark Renewed"** button
3. Policy moves to "Completed Renewals"

### Analytics & Reports

#### Viewing Your Analytics

1. Click **"Analytics"** in the menu
2. See your performance metrics:
   - Total commission trend (last 6 months)
   - Policy type distribution
   - Top companies you work with
   - Average policy value

#### Exporting Reports

1. On Analytics page, click **"Export CSV"**
2. File downloads automatically
3. Open in Excel or Google Sheets
4. Use for your records or accounting

### Notifications

#### Checking Notifications

1. Click the **Bell icon** in header
2. Or visit **"Notifications"** page
3. See all alerts sorted by priority

#### Types of Notifications

- **Renewal Reminders**: Policies expiring soon
- **Commission Alerts**: Pending payments
- **System Updates**: Important announcements

#### Managing Notifications

- Click "Mark as read" on individual notifications
- Use "Mark All as Read" for bulk action
- Click X to delete notifications
- Filter by "All" or "Unread"

---

## For Admins

### Admin Dashboard

Your dashboard shows system-wide metrics:
- Total sub-brokers
- Total insurance companies
- Total policies in system
- Total commissions generated

### Managing Sub-Brokers

#### Adding a New Sub-Broker

1. Click **"Admin Dashboard"**
2. Click **"Manage Sub-Brokers"**
3. Click **"Add Sub-Broker"** button
4. Fill in details:
   - Name
   - Email (will be used for login)
   - Password
   - Phone number
   - Broker Code (unique identifier)
5. Click **"Create Sub-Broker"**

**Share login credentials with the new broker securely**

#### Viewing All Brokers

See complete list with:
- Broker code
- Name
- Email
- Phone
- Registration date

#### Deleting a Broker

1. Find broker in the list
2. Click **"Delete"** button
3. Confirm the action

**Warning: This will not delete their policies, only their account**

### Managing Insurance Companies

#### Adding a Company

1. Go to **"Manage Companies"**
2. Click **"Add Company"**
3. Enter details:
   - Company Name
   - Company Code (e.g., HDFC, ICICI)
   - Contact Email (optional)
   - Contact Phone (optional)
4. Click **"Create Company"**

#### Deleting a Company

1. Find company in list
2. Click **"Delete"** button
3. Confirm

**Warning: Cannot delete if company has existing policies**

### Bulk Upload Policies

#### Preparing CSV File

1. Click **"Bulk Upload Policies"**
2. Click **"Download CSV Template"**
3. Open template in Excel
4. Fill in columns:
   - policy_number
   - company_code (must exist in system)
   - broker_code (must exist in system)
   - customer_name
   - customer_email
   - customer_phone
   - policy_type (health/life/motor/term)
   - premium_amount
   - sum_assured
   - start_date (YYYY-MM-DD)
   - end_date (YYYY-MM-DD)
5. Save as CSV file

#### Uploading Policies

1. Click **"Choose File"** and select your CSV
2. Click **"Upload Policies"**
3. Wait for processing
4. View results:
   - Successful uploads
   - Failed uploads with error details

**Tips:**
- Verify company_code and broker_code exist
- Use correct date format
- Check for duplicate policy numbers
- Validate email formats

### Configuring Commission Rules

#### Creating a Commission Rule

1. Go to **"Commission Rules"**
2. Click **"Add Rule"**
3. Select:
   - Insurance Company
   - Policy Type
4. Configure Tiers:
   - Min Premium: Starting amount
   - Max Premium: Ending amount (leave empty for unlimited)
   - Rate: Commission percentage

**Example Tier Structure:**
```
Tier 1: ₹0 - ₹50,000 = 5%
Tier 2: ₹50,001 - ₹100,000 = 7%
Tier 3: ₹100,001+ = 10%
```

5. Click **"Create Rule"**

#### How Tiers Work

When a policy is created:
1. System finds matching rule (company + policy type)
2. Checks premium amount against tiers
3. Applies appropriate commission rate
4. Auto-calculates and creates commission record

### System Analytics

#### Viewing Analytics

1. Click **"View System Analytics"**
2. See comprehensive data:
   - Total revenue
   - Total policies
   - Active brokers
   - Monthly growth trends
   - Top performing brokers
   - Top insurance companies

#### Exporting System Reports

1. On Analytics page
2. Click **"Export Report"**
3. CSV file downloads with:
   - Overall metrics
   - Top brokers performance
   - Company analysis
   - Monthly trends

---

## Common Tasks

### Changing Your Password

1. Contact your administrator
2. They will reset your password
3. Login with new credentials

### Finding a Specific Policy

**Method 1: Search**
- Go to Policies page
- Type in search box:
  - Policy number
  - Customer name
  - Company name

**Method 2: Filter**
- Use status filter (Active/Expired)
- Sort by date, premium, etc.

### Checking Commission Payment

1. Go to **"Commissions"**
2. Find policy in history table
3. Check "Payment Status" column:
   - **Paid** (Green): Payment received
   - **Pending** (Yellow): Awaiting payment
   - **Processing** (Blue): Being processed

### Following Up on Renewals

1. Go to **"Renewals"**
2. Filter by "Upcoming"
3. Prioritize by urgency (red badges first)
4. Contact customers
5. After renewal, click **"Mark Renewed"**

### Downloading Reports

**For Sub-Brokers:**
- Analytics page → "Export CSV"
- Includes your personal data only

**For Admins:**
- System Analytics → "Export Report"
- Includes all brokers and companies data

---

## FAQs

### General Questions

**Q: How do I reset my password?**
A: Contact your system administrator. They can reset it for you.

**Q: Can I access the system on mobile?**
A: Yes! The system is mobile-responsive and works on all devices.

**Q: How often is data updated?**
A: Real-time. Changes reflect immediately.

### For Sub-Brokers

**Q: Why is my commission not showing?**
A: Commission is calculated when policy is created. Check if policy was added correctly.

**Q: How are commissions calculated?**
A: Based on premium amount and tier structure set by admin for each company and policy type.

**Q: When do I receive commission payments?**
A: Payment schedule is managed by admin. Check commission status regularly.

**Q: Can I edit a policy after creation?**
A: Currently editing is limited. Contact admin for policy modifications.

**Q: How do I know when renewals are due?**
A: You'll receive email reminders at 30, 15, 7, and 1 day before expiration. Also check the Renewals page and Notifications.

### For Admins

**Q: How do I add multiple brokers quickly?**
A: Use the "Add Sub-Broker" form. For bulk addition, contact technical support.

**Q: Can I change commission rules later?**
A: Yes, but changes only apply to new policies, not existing ones.

**Q: What happens if I delete a broker?**
A: Their account is removed but their policies remain in the system.

**Q: How do I backup data?**
A: Database backups are automatic on most hosting platforms. Contact technical team for manual backup.

**Q: Can I customize email templates?**
A: Yes, requires code modification. Contact technical support.

### Technical Issues

**Q: System is slow. What should I do?**
A: Clear browser cache, check internet connection. If issue persists, contact technical support.

**Q: Getting "Session Expired" message**
A: Your login session timed out. Simply login again.

**Q: CSV upload fails. Why?**
A: Check for:
- Correct CSV format
- Valid company/broker codes
- Proper date format (YYYY-MM-DD)
- No duplicate policy numbers

**Q: Not receiving renewal emails**
A: Check spam folder. Ensure email service is configured correctly (admin task).

---

## Support

### Getting Help

**For Users:**
- Contact your system administrator
- Email: admin@yourcompany.com

**For Admins:**
- Technical Support: support@yourcompany.com
- Documentation: See SETUP.md and DEPLOYMENT.md

### Reporting Issues

When reporting problems, include:
1. What you were trying to do
2. What happened instead
3. Any error messages
4. Screenshots (if possible)

---

## Quick Reference Card

### Sub-Broker Navigation
```
Dashboard → Overview
Policies → Add/View policies
Commissions → Track earnings
Renewals → Manage renewals
Analytics → View performance
Notifications → Check alerts
```

### Admin Navigation
```
Admin Dashboard → System overview
Manage Sub-Brokers → Add/remove brokers
Manage Companies → Add/remove companies
Bulk Upload → Upload CSV policies
Commission Rules → Configure tiers
System Analytics → Performance reports
```

### Important Dates
- Renewal reminders: 30, 15, 7, 1 days before expiry
- Cron job runs: Daily at 9:00 AM
- Session timeout: 15 minutes of inactivity

---

**Need more help? Contact your administrator or check the technical documentation.**
