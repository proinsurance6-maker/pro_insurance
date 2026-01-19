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
- **Broker Commission Rate:** 15% = ₹1,500
- **Sub-Agent Share:** 60% = ₹900
- **User Profit:** ₹1,500 - ₹900 = ₹600

**In Database:**
```typescript
{
  totalCommissionAmount: 1500,      // From Broker
  subAgentCommissionAmount: 900,    // Payable to Sub-Agent
  agentCommissionAmount: 600        // User's PROFIT (Net Keep)
}
```

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
// Broker pays: 15% of ₹10,000 = ₹1,500
totalCommissionAmount = 1500

// Sub-agent gets: 60% of ₹1,500 = ₹900
subAgentCommissionAmount = 900

// User keeps: ₹1,500 - ₹900 = ₹600
agentCommissionAmount = 600
```

### Step 3: Ledger Impact
**Sub-Agent Ledger:**
- CREDIT: ₹900 (commission earned)
- Status: Receivable until marked as paid

**User Profit:**
- Net earning from this policy: ₹600

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
Sub-Agent Share: 60% = ₹900
User Keeps: ₹600 (40%)
```

### Scenario 3: Motor Policy (OD + TP)
```
OD Premium: ₹8,000 @ 15% = ₹1,200
TP Premium: ₹2,000 @ 5% = ₹100
Total Commission: ₹1,300
Sub-Agent (60%): ₹780
User Keeps: ₹520
```

---

## 📝 Summary

**Remember:**
- **User = Main Agent = Business Owner** (YOU)
- **Broker = Source of Commission** (PolicyBazaar) → Pays YOU
- **Sub-Agent = Your Sales Partner** → YOU pay them
- **User Profit = Broker Commission - Sub-Agent Payout**

**Commission Direction:**
```
Broker → [USER] → Sub-Agent
       RECEIVES  PAYS
```

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
