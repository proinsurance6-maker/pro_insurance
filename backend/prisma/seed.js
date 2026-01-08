const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting seed...\n');

  // Create Insurance Companies
  console.log('📦 Creating Insurance Companies...');
  const companies = await Promise.all([
    prisma.insuranceCompany.create({
      data: {
        name: 'ICICI Lombard',
        code: 'ICICI',
        contactPerson: 'Support Team',
        email: 'support@icicilombard.com',
        phone: '1800-2666',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'HDFC ERGO',
        code: 'HDFC',
        contactPerson: 'Support Team',
        email: 'support@hdfcergo.com',
        phone: '1800-2700-700',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'Bajaj Allianz',
        code: 'BAJAJ',
        contactPerson: 'Support Team',
        email: 'support@bajajallianz.com',
        phone: '1800-209-5858',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'New India Assurance',
        code: 'NIA',
        contactPerson: 'Support Team',
        email: 'support@newindia.co.in',
        phone: '1800-209-1415',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'United India Insurance',
        code: 'UII',
        contactPerson: 'Support Team',
        email: 'support@uiic.co.in',
        phone: '1800-425-3333',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'Tata AIG',
        code: 'TATA',
        contactPerson: 'Support Team',
        email: 'support@tataaig.com',
        phone: '1800-266-7780',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'Reliance General',
        code: 'RELIANCE',
        contactPerson: 'Support Team',
        email: 'support@reliancegeneral.co.in',
        phone: '1800-102-2844',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'SBI General',
        code: 'SBI',
        contactPerson: 'Support Team',
        email: 'support@sbigeneral.in',
        phone: '1800-102-1111',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'Oriental Insurance',
        code: 'ORIENTAL',
        contactPerson: 'Support Team',
        email: 'support@orientalinsurance.co.in',
        phone: '1800-118-485',
        isActive: true
      }
    }),
    prisma.insuranceCompany.create({
      data: {
        name: 'National Insurance',
        code: 'NATIONAL',
        contactPerson: 'Support Team',
        email: 'support@nicl.in',
        phone: '1800-345-0330',
        isActive: true
      }
    })
  ]);
  console.log(`✅ Created ${companies.length} insurance companies\n`);

  // Create Demo Agent
  console.log('👤 Creating Demo Agent...');
  const hashedPassword = await bcrypt.hash('agent123', 10);
  const trialStartDate = new Date();
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 60); // 60 days trial

  const agent = await prisma.agent.create({
    data: {
      agentCode: 'AGT001',
      name: 'Demo Agent',
      email: 'agent@demo.com',
      phone: '9876543210',
      passwordHash: hashedPassword,
      address: 'Mumbai, Maharashtra',
      teamMode: 'TEAM',
      isActive: true,
      subscription: {
        create: {
          status: 'TRIAL',
          trialStartDate: trialStartDate,
          trialEndDate: trialEndDate,
          monthlyAmount: 100
        }
      }
    }
  });
  console.log(`✅ Created agent: ${agent.name} (${agent.agentCode})\n`);

  // Create Sub-Agent
  console.log('👥 Creating Sub-Agent...');
  const subAgent = await prisma.subAgent.create({
    data: {
      agentId: agent.id,
      subAgentCode: 'SUB001',
      name: 'Demo Sub-Agent',
      email: 'subagent@demo.com',
      phone: '9876543211',
      commissionPercentage: 50,
      ledgerBalance: 0,
      isActive: true
    }
  });
  console.log(`✅ Created sub-agent: ${subAgent.name}\n`);

  // Create Demo Client
  console.log('👨‍👩‍👧 Creating Demo Client with Family...');
  const client = await prisma.client.create({
    data: {
      agentId: agent.id,
      clientCode: 'CLT001',
      name: 'Rajesh Kumar',
      email: 'rajesh@email.com',
      phone: '9876543212',
      address: 'Delhi, India',
      dateOfBirth: new Date('1985-05-15'),
      panNumber: 'ABCDE1234F',
      pendingAmount: 0,
      isActive: true,
      familyMembers: {
        create: [
          {
            name: 'Priya Kumar',
            relationship: 'Spouse',
            dateOfBirth: new Date('1988-08-20')
          },
          {
            name: 'Aarav Kumar',
            relationship: 'Son',
            dateOfBirth: new Date('2015-03-10')
          }
        ]
      }
    },
    include: {
      familyMembers: true
    }
  });
  console.log(`✅ Created client: ${client.name} with ${client.familyMembers.length} family members\n`);

  // Create Demo Policy
  console.log('📄 Creating Demo Policy...');
  const policy = await prisma.policy.create({
    data: {
      policyNumber: 'POL-2026-001',
      companyId: companies[0].id, // ICICI Lombard
      agentId: agent.id,
      subAgentId: subAgent.id,
      clientId: client.id,
      policyType: 'Motor',
      planName: 'Comprehensive',
      policySource: 'NEW',
      sumAssured: 500000,
      premiumAmount: 15000,
      premiumFrequency: 'yearly',
      premiumPaidBy: 'CLIENT',
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      vehicleNumber: 'MH-01-AB-1234',
      status: 'active'
    }
  });
  console.log(`✅ Created policy: ${policy.policyNumber}\n`);

  // Create Commission Entry
  console.log('💰 Creating Commission Entry...');
  const commission = await prisma.commission.create({
    data: {
      policyId: policy.id,
      agentId: agent.id,
      subAgentId: subAgent.id,
      companyId: companies[0].id,
      totalCommissionPercent: 15,
      totalCommissionAmount: 2250, // 15% of 15000
      agentCommissionAmount: 1125, // 50% of total
      subAgentCommissionAmount: 1125, // 50% of total
      paymentStatus: 'pending',
      commissionType: 'new_business'
    }
  });
  console.log(`✅ Created commission: ₹${commission.totalCommissionAmount}\n`);

  // Create Renewal Entry
  console.log('🔄 Creating Renewal Entry...');
  const renewal = await prisma.renewal.create({
    data: {
      policyId: policy.id,
      renewalDate: policy.endDate,
      renewalStatus: 'pending'
    }
  });
  console.log(`✅ Created renewal reminder for: ${renewal.renewalDate.toDateString()}\n`);

  console.log('🎉 Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log('-------------------');
  console.log(`Insurance Companies: ${companies.length}`);
  console.log(`Agent: ${agent.email} / agent123`);
  console.log(`Sub-Agent: ${subAgent.name}`);
  console.log(`Client: ${client.name}`);
  console.log(`Policies: 1`);
  console.log('-------------------');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
