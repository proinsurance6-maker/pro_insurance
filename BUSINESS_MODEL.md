# Insurance Book SaaS - Business Model & Terminology

## 🎯 Overview
This system is designed for **insurance agents in India** who run their own insurance business. The agent uses this software to manage policies, commissions, and sub-agents.

---

## 👥 Key Entities & Their Roles

### 1. **User (Master Agent / Main Agent)**
**Who:** The primary user of this software - the business owner  
**Role:** Runs their own insurance agency business  
**Revenue Source:** Receives commission from Brokers/Companies for policies sold  
**Expenses:** Pays commission to Sub-Agents who bring business  
**Profit:** `Broker Commission - Sub-Agent Commission`

**Example:**  
- Name: Divyans (AGT0003)
- Business: Insurance agent running "Pro Insurance"
- Uses this software to manage their entire operation

---

### 2. **Broker (Commission Source)**
**Who:** Third-party insurance platforms/aggregators  
**Examples:** PolicyBazaar, MitPro, Probus, Turtlemint  
**Role:** Source of policies - they provide leads/policies to the agent  
**Commission Flow:** `Broker → User (Main Agent)`  
**Relationship:** The user receives commission FROM the broker

**Business Flow:**
```
Client buys policy via Broker → Broker pays commission to User
```

**Fields in System:**
- `brokerId` - Reference to broker (PolicyBazaar, MitPro, etc.)
- `brokerCommissionAmount` - Total commission received from broker

---

### 3. **Sub-Agent (Commission Expense)**
**Who:** Sales partners who work UNDER the main agent  
**Role:** Bring insurance business to the main agent  
**Commission Flow:** `User (Main Agent) → Sub-Agent`  
**Relationship:** The user PAYS commission TO sub-agents

**Business Flow:**
```
Sub-Agent brings client → Policy created → User pays commission to Sub-Agent
```

**Fields in System:**
- `subAgentId` - Reference to sub-agent
- `subAgentCommissionAmount` - Commission payable to sub-agent
- `subAgentCommissionPercentage` - Their share percentage

**Example:**
- Sub-Agent: Anil Pandey
- Brings 10 policies per month
- Gets 60% of broker commission
- Main agent keeps 40%

---

## 💰 Commission Flow

### Complete Flow Diagram
```
Insurance Company/Broker
        ↓ (Pays Commission)
    USER (MAIN AGENT)
        ↓ (Pays Commission)
     Sub-Agent
```

### Example Calculation
**Scenario:** Motor Insurance Policy  
- **Premium:** ₹10,000
- **Broker Commission Rate:** 15% (decided by broker) = ₹1,500
- **Sub-Agent Commission:** 10% (decided by USER per policy) = ₹1,000
- **User Profit:** ₹1,500 - ₹1,000 = ₹500

**In Database:**
```typescript
{
  totalCommissionAmount: 1500,      // From Broker (15% of premium)
  subAgentCommissionAmount: 1000,   // TO Sub-Agent (10% of premium - USER decides)
  agentCommissionAmount: 500        // User's PROFIT (Net Keep)
}
```

**IMPORTANT:** 
- Broker rate varies per policy (PolicyBazaar 15%, MitPro 12%, etc.)
- Sub-agent rate is SET BY USER for each policy (not a fixed percentage)
- User manually decides how much to pay sub-agent when creating policy

---

## 📊 Database Schema - Commission Table

### Field Mapping
| Field Name | Meaning | Direction |
|------------|---------|-----------|
| `totalCommissionAmount` | Total commission from broker | INCOMING |
| `agentCommissionAmount` | **USER'S PROFIT** (after paying sub-agent) | USER KEEPS |
| `subAgentCommissionAmount` | Commission to pay to sub-agent | OUTGOING |
| `receivedFromCompany` | Has broker paid the user? | Tracking |
| `paidToSubAgent` | Has user paid the sub-agent? | Tracking |

---

## 🔄 Policy Creation Flow

### Step 1: Policy Entry
```typescript
{
  clientId: "client-123",
  companyId: "hdfc-ergo",
  brokerId: "policybazaar",      // Source of commission
  subAgentId: "sub-agent-456",   // Who will receive payout
  premiumAmount: 10000,
  commissionPercent: 15          // From broker
}
```

### Step 2: Auto-Calculate Commissions
```typescript
// USER MANUALLY ENTERS THESE RATES:
// - Broker Commission: 15% (or ₹1,500 fixed amount)
// - Sub-agent Commission: 10% (USER decides - not fixed per sub-agent)

// System calculates:
totalCommissionAmount = 1500      // From broker
subAgentCommissionAmount = 1000   // User-defined rate (10% of premium)
agentCommissionAmount = 500       // Auto-calculated: 1500 - 1000
```

### Step 3: Ledger Impact
**Sub-Agent Ledger:**
- CREDIT: ₹1,000 (commission earned - as per USER's rate)
- Status: Receivable until marked as paid

**User Profit:**
- Net earning from this policy: ₹500

**KEY POINT:** User has full flexibility to decide sub-agent commission per policy!

---

## 📖 Ledger System

### Sub-Agent Ledger (Khata)
**Purpose:** Track what the user owes to each sub-agent

**Entry Types:**
- **CREDIT:** Commission earned by sub-agent (₹900)
- **DEBIT:** Payment made by user to sub-agent (₹900)

**Tabs:**
1. **All Policies:** Complete history
2. **Receivable Payout:** ₹900 pending - user needs to pay
3. **Paid Payout:** ₹900 paid - settled

### Master Ledger (Commission Ledger)
**Purpose:** Overview of all policies and commissions

**Shows:**
- Total commission from brokers
- Sub-agent payouts
- User's net profit

---

## 🎨 UI Terminology (User-Facing)

### ✅ Correct Terms
| Backend Field | User Sees | Meaning |
|---------------|-----------|---------|
| `agentCommissionAmount` | "Your Payout" / "Your Profit" | What you keep |
| `subAgentCommissionAmount` | "Sub-Agent Payout" | What you pay them |
| `totalCommissionAmount` | "Total Commission" | From broker |
| `broker` | "Source" / "Broker" | PolicyBazaar, MitPro |
| `subAgent` | "Partner" / "Sub-Agent" | Your sales team |

### ❌ Avoid Confusion
- Don't call user "agent" in UI - they are the "business owner"
- Don't say "agent receives from sub-agent" - it's the opposite
- Don't mix broker and sub-agent roles

---

## 🔐 Security & Multi-Tenancy

### Agent Isolation
- Each user (main agent) sees ONLY their data
- All queries filtered by `agentId`
- Sub-agents belong to specific agents

```typescript
// CORRECT ✅
const policies = await prisma.policy.findMany({
  where: { agentId: req.user.userId }
});

// WRONG ❌
const policies = await prisma.policy.findMany();
```

---

## 📱 Mobile App Context

When building mobile app, remember:
- **User login:** Main agent (business owner)
- **Dashboard shows:**
  - Total revenue (from brokers)
  - Sub-agent expenses
  - Net profit
- **Sub-Agents tab:** List of sales partners
- **Ledger:** What user owes to each sub-agent

---

## 🚀 Common Scenarios

### Scenario 1: Direct Policy (No Sub-Agent)
```
Premium: ₹10,000
Broker Commission: 15% = ₹1,500
Sub-Agent: None
User Keeps: ₹1,500 (100%)
```

### Scenario 2: Policy via Sub-Agent
```
Premium: ₹10,000
Broker Commission: 15% = ₹1,500
Sub-Agent Rate: 10% (USER decides) = ₹1,000
User Keeps: ₹500
```
**Note:** User can give 5%, 10%, 15% - any rate they want per policy!

### Scenario 3: Motor Policy (OD + TP)
```
OD Premium: ₹8,000
  - Broker Rate: 15% = ₹1,200
  - Sub-Agent Rate: 8% (USER decides) = ₹640
  
TP Premium: ₹2,000
  - Broker Rate: 5% = ₹100  
  - Sub-Agent Rate: 3% (USER decides) = ₹60

Total Commission: ₹1,300
Total to Sub-Agent: ₹700
User Keeps: ₹600
```
**Note:** User can set DIFFERENT rates for OD and TP for sub-agent!

---

## 📝 Summary

**Remember:**
- **User = Main Agent = Business Owner** (YOU)
- **Broker = Source of Commission** (PolicyBazaar) → Pays YOU
  - Rate varies per policy (15%, 12%, 10% etc.)
- **Sub-Agent = Your Sales Partner** → YOU pay them
  - Rate decided by YOU for each policy (flexible)
- **User Profit = Broker Commission - Sub-Agent Commission**

**Commission Direction:**
```
Broker → [USER] → Sub-Agent
       RECEIVES  PAYS
```

**Flexibility:**
- Broker rate: Different per policy (set by broker/company)
- Sub-agent rate: **USER DECIDES** for every policy (manual input)

---

## 🔧 Developer Notes

### Key Files
- `backend/src/services/commission.service.ts` - Commission calculation logic
- `backend/src/controllers/policy.controller.ts` - Policy creation with auto-commission
- `frontend/app/dashboard/ledger/page.tsx` - Master ledger view
- `frontend/app/dashboard/sub-agents/[id]/page.tsx` - Sub-agent ledger with 3 tabs

### Naming Convention
- `agentCommissionAmount` = User's profit (keep as is for backward compatibility)
- In comments, clarify: "User's profit after paying sub-agent"
- In UI, display as "Your Payout" or "Net Profit"

---

**Last Updated:** January 19, 2026  
**Version:** 1.0  
**Author:** Pro Insurance Development Team
