# API Documentation - Insurance Broker Management System

Base URL: `https://your-api-domain.com/api`

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require authentication via JWT token.

### Headers Required
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## Authentication Endpoints

### POST /auth/login
Login to the system

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "sub_broker"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/refresh
Refresh expired access token

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token"
  }
}
```

---

## Policy Endpoints

### GET /policies
Get all policies (filtered by user role)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search term
- `companyId` (optional): Filter by company
- `status` (optional): active | expired

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "policyNumber": "POL001",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerPhone": "9876543210",
      "policyType": "health",
      "premiumAmount": "50000.00",
      "sumAssured": "500000.00",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2025-01-01T00:00:00.000Z",
      "status": "active",
      "company": {
        "id": 1,
        "name": "HDFC Life",
        "companyCode": "HDFC"
      },
      "subBroker": {
        "id": 1,
        "name": "Broker Name",
        "brokerCode": "BRK001"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### POST /policies
Create a new policy

**Request Body:**
```json
{
  "policyNumber": "POL001",
  "companyId": 1,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9876543210",
  "policyType": "health",
  "premiumAmount": 50000,
  "sumAssured": 500000,
  "startDate": "2024-01-01",
  "endDate": "2025-01-01"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "policy": { /* policy object */ },
    "commission": { /* auto-created commission */ },
    "renewal": { /* auto-created renewal */ }
  },
  "message": "Policy created successfully"
}
```

### GET /policies/:id
Get policy by ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "policyNumber": "POL001",
    /* ... other fields ... */
    "commission": { /* commission details */ },
    "renewal": { /* renewal details */ }
  }
}
```

### POST /policies/bulk-upload (Admin Only)
Upload multiple policies via CSV

**Request:**
- Content-Type: `multipart/form-data`
- Field: `file` (CSV file)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "successful": 95,
    "failed": 5,
    "errors": [
      {
        "row": 3,
        "message": "Invalid company code"
      }
    ]
  }
}
```

---

## Commission Endpoints

### GET /commissions
Get all commissions

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "policyId": 1,
      "baseAmount": "50000.00",
      "commissionPercentage": "5.00",
      "commissionAmount": "2500.00",
      "paymentStatus": "pending",
      "paymentDate": null,
      "policy": { /* policy details */ },
      "company": { /* company details */ }
    }
  ]
}
```

### GET /commissions/summary
Get commission summary

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 250000,
    "paid": 150000,
    "pending": 100000
  }
}
```

### PUT /commissions/:id
Update commission payment status

**Request Body:**
```json
{
  "paymentStatus": "paid",
  "paymentDate": "2024-01-15"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated commission */ }
}
```

---

## Renewal Endpoints

### GET /renewals
Get all renewals

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "policyId": 1,
      "renewalDate": "2025-01-01T00:00:00.000Z",
      "isRenewed": false,
      "reminderSent30Days": true,
      "reminderSent15Days": false,
      "policy": { /* policy details */ }
    }
  ]
}
```

### GET /renewals/upcoming
Get upcoming renewals (next 30 days)

**Response (200):**
```json
{
  "success": true,
  "data": [ /* renewals expiring soon */ ]
}
```

### PUT /renewals/:id
Mark renewal as completed

**Request Body:**
```json
{
  "isRenewed": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated renewal */ }
}
```

---

## Sub-Broker Endpoints (Admin Only)

### GET /sub-brokers
Get all sub-brokers

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Broker Name",
      "email": "broker@example.com",
      "phone": "9876543210",
      "brokerCode": "BRK001",
      "role": "sub_broker",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /sub-brokers
Create new sub-broker

**Request Body:**
```json
{
  "name": "Broker Name",
  "email": "broker@example.com",
  "password": "secure_password",
  "phone": "9876543210",
  "brokerCode": "BRK001"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { /* created broker */ },
  "message": "Sub-broker created successfully"
}
```

### DELETE /sub-brokers/:id
Delete sub-broker

**Response (200):**
```json
{
  "success": true,
  "message": "Sub-broker deleted successfully"
}
```

---

## Insurance Company Endpoints

### GET /companies
Get all insurance companies

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "HDFC Life",
      "companyCode": "HDFC",
      "contactEmail": "contact@hdfc.com",
      "contactPhone": "1800-xxx-xxxx",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /companies (Admin Only)
Create new insurance company

**Request Body:**
```json
{
  "name": "HDFC Life",
  "companyCode": "HDFC",
  "contactEmail": "contact@hdfc.com",
  "contactPhone": "1800-xxx-xxxx"
}
```

### DELETE /companies/:id (Admin Only)
Delete insurance company

---

## Commission Rule Endpoints (Admin Only)

### GET /commission-rules
Get all commission rules

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "companyId": 1,
      "policyType": "health",
      "tierRules": [
        {
          "minPremium": 0,
          "maxPremium": 50000,
          "rate": 5
        },
        {
          "minPremium": 50001,
          "maxPremium": 100000,
          "rate": 7
        },
        {
          "minPremium": 100001,
          "maxPremium": null,
          "rate": 10
        }
      ],
      "isActive": true,
      "company": { /* company details */ }
    }
  ]
}
```

### POST /commission-rules
Create commission rule

**Request Body:**
```json
{
  "companyId": 1,
  "policyType": "health",
  "tierRules": [
    {
      "minPremium": 0,
      "maxPremium": 50000,
      "rate": 5
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details (only in development)"
}
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Headers**:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets

---

## Postman Collection

Import this collection for easy API testing:

```json
{
  "info": {
    "name": "Insurance API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"admin@insurance.com\",\"password\":\"admin123\"}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api"
    }
  ]
}
```

---

**For more details, see the source code or contact the development team.**
