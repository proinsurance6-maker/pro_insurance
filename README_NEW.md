# Pro Insurance - Insurance Broker Management System

🚀 **Complete Insurance Broker Management Platform**

## 📋 Project Overview
Full-stack application for managing insurance policies, sub-brokers, commissions, and automated renewal tracking across multiple insurance companies.

## ✨ Features

### For Sub-Brokers
- 📊 Dashboard with key metrics
- 📝 Policy management (add, view, track)
- 💰 Commission tracking (paid/pending)
- 🔔 Renewal reminders
- 📈 Analytics & reports
- 🔔 In-app notifications

### For Admins
- 👥 Manage sub-brokers
- 🏢 Manage insurance companies
- 📤 Bulk policy upload (CSV)
- ⚙️ Configure commission rules
- 📊 System-wide analytics
- 📧 Automated email notifications

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS + shadcn/ui
- React Query

**Backend:**
- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- node-cron (scheduled jobs)
- Nodemailer (emails)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone repository**
```bash
git clone https://github.com/proinsurance6-maker/pro_insurance.git
cd pro_insurance
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Configure .env with your database and email settings
npx prisma migrate dev
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL
npm run dev
```

4. **Access Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Default Admin: admin@insurance.com / admin123

## 📚 Documentation

- [Setup Guide](SETUP.md)
- [Deployment Guide](DEPLOY_NOW.md)
- [API Documentation](API_DOCUMENTATION.md)
- [User Manual](USER_MANUAL.md)
- [Roadmap](ROADMAP.md)

## 🎯 Key Capabilities

✅ **Automated Commission Calculation** - Based on tiered rules  
✅ **Renewal Reminders** - Email alerts at 30, 15, 7, 1 day before expiry  
✅ **Bulk Upload** - Import 100+ policies via CSV  
✅ **Role-Based Access** - Admin and Sub-Broker roles  
✅ **Analytics Dashboard** - Revenue trends, policy stats  
✅ **Mobile Responsive** - Works on all devices  

## 📄 License

MIT License

## 👨‍💻 Author

Pro Insurance Team

## 🤝 Contributing

Pull requests are welcome!

---

**Built with ❤️ for Insurance Brokers**
