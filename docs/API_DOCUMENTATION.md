# Subscription Management API Documentation

## Overview

This API provides comprehensive subscription management functionality including subscription CRUD operations, payment history tracking, analytics, settings management, and exchange rate handling.

**Base URL:** `http://localhost:3001/api`

## Authentication

Protected endpoints require an API key to be included in the request headers:

```
X-API-KEY: your-api-key-here
```

The API key should be configured in the `.env` file as `API_KEY=your-secret-key`.

## Response Format

All API responses are in JSON format. Successful responses return the requested data, while error responses follow this structure:

```json
{
  "error": "Error message description"
}
```

## Endpoints

### Health Check

#### GET /health
Check if the API server is running.

**Response:**
```json
{
  "message": "Subscription Management Backend is running!",
  "status": "healthy"
}
```

---

## Subscriptions

### GET /subscriptions
Get all subscriptions.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-08-01",
    "last_billing_date": "2025-07-01",
    "amount": 15.99,
    "currency": "USD",
    "payment_method": "Credit Card",
    "start_date": "2024-01-01",
    "status": "active",
    "category": "video",
    "renewal_type": "auto",
    "notes": "Family plan",
    "website": "https://netflix.com",
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  }
]
```

### GET /subscriptions/:id
Get a specific subscription by ID.

**Parameters:**
- `id` (path): Subscription ID

**Response:** Single subscription object (same structure as above)

### POST /subscriptions 🔒
Create a new subscription.

**Request Body:**
```json
{
  "name": "Netflix",
  "plan": "Premium",
  "billing_cycle": "monthly",
  "next_billing_date": "2025-08-01",
  "amount": 15.99,
  "currency": "USD",
  "payment_method": "Credit Card",
  "start_date": "2025-07-01",
  "status": "active",
  "category": "video",
  "renewal_type": "auto",
  "notes": "Family plan",
  "website": "https://netflix.com"
}
```

**Response:**
```json
{
  "id": 1
}
```

### POST /subscriptions/bulk 🔒
Create multiple subscriptions at once.

**Request Body:** Array of subscription objects

**Response:**
```json
{
  "message": "Successfully imported 5 subscriptions."
}
```

### PUT /subscriptions/:id 🔒
Update a subscription.

**Parameters:**
- `id` (path): Subscription ID

**Request Body:** Partial subscription object with fields to update

**Response:**
```json
{
  "message": "Subscription updated successfully"
}
```

### DELETE /subscriptions/:id 🔒
Delete a subscription.

**Parameters:**
- `id` (path): Subscription ID

**Response:**
```json
{
  "message": "Subscription deleted successfully"
}
```

---

## Subscription Management

### POST /subscriptions/auto-renew 🔒
Process automatic renewals for all eligible subscriptions.

**Response:**
```json
{
  "message": "Auto renewal complete: 3 processed, 0 errors",
  "processed": 3,
  "errors": 0,
  "renewedSubscriptions": [
    {
      "id": 1,
      "name": "Netflix",
      "oldNextBilling": "2025-07-01",
      "newLastBilling": "2025-07-01",
      "newNextBilling": "2025-08-01"
    }
  ]
}
```

### POST /subscriptions/process-expired 🔒
Mark expired manual renewal subscriptions as cancelled.

**Response:**
```json
{
  "message": "Expired subscriptions processed: 2 expired, 0 errors",
  "processed": 2,
  "errors": 0,
  "expiredSubscriptions": [
    {
      "id": 2,
      "name": "Spotify",
      "expiredDate": "2025-06-30"
    }
  ]
}
```

### POST /subscriptions/:id/manual-renew 🔒
Manually renew a subscription.

**Parameters:**
- `id` (path): Subscription ID

**Response:**
```json
{
  "message": "Subscription renewed successfully",
  "renewalData": {
    "id": 1,
    "name": "Netflix",
    "oldNextBilling": "2025-07-01",
    "newLastBilling": "2025-07-01",
    "newNextBilling": "2025-08-01",
    "renewedEarly": false
  }
}
```

### POST /subscriptions/:id/reactivate 🔒
Reactivate a cancelled subscription.

**Parameters:**
- `id` (path): Subscription ID

**Response:**
```json
{
  "message": "Subscription reactivated successfully",
  "reactivationData": {
    "id": 1,
    "name": "Netflix",
    "newLastBilling": "2025-07-01",
    "newNextBilling": "2025-08-01",
    "status": "active"
  }
}
```

### POST /subscriptions/reset 🔒
Delete all subscriptions (use with caution).

**Response:**
```json
{
  "message": "All subscriptions have been deleted."
}
```

---

## Payment History

### GET /payment-history
Get payment history with optional filters.

**Query Parameters:**
- `subscription_id` (optional): Filter by subscription ID
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `status` (optional): Payment status (succeeded, failed, pending, cancelled)
- `currency` (optional): Filter by currency
- `limit` (optional): Number of records per page (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "payments": [
    {
      "id": 1,
      "subscriptionId": 1,
      "subscriptionName": "Netflix",
      "subscriptionPlan": "Premium",
      "paymentDate": "2025-07-01",
      "amountPaid": 15.99,
      "currency": "USD",
      "billingPeriod": {
        "start": "2025-07-01",
        "end": "2025-08-01"
      },
      "status": "succeeded",
      "notes": "Auto renewal payment",
      "createdAt": "2025-07-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "subscriptionId": null,
    "startDate": null,
    "endDate": null,
    "status": null,
    "currency": null
  }
}
```

### GET /payment-history/:id
Get a specific payment history record.

**Parameters:**
- `id` (path): Payment history record ID

**Response:**
```json
{
  "id": 1,
  "subscriptionId": 1,
  "subscriptionName": "Netflix",
  "subscriptionPlan": "Premium",
  "subscriptionBillingCycle": "monthly",
  "paymentDate": "2025-07-01",
  "amountPaid": 15.99,
  "currency": "USD",
  "billingPeriod": {
    "start": "2025-07-01",
    "end": "2025-08-01"
  },
  "status": "succeeded",
  "notes": "Auto renewal payment",
  "createdAt": "2025-07-01T00:00:00.000Z"
}
```

### POST /payment-history 🔒
Create a new payment history record.

**Request Body:**
```json
{
  "subscription_id": 1,
  "payment_date": "2025-07-01",
  "amount_paid": 15.99,
  "currency": "USD",
  "billing_period_start": "2025-07-01",
  "billing_period_end": "2025-08-01",
  "status": "succeeded",
  "notes": "Manual payment entry"
}
```

**Response:**
```json
{
  "id": 1,
  "message": "Payment history record created successfully"
}
```

### PUT /payment-history/:id 🔒
Update a payment history record.

**Parameters:**
- `id` (path): Payment history record ID

**Request Body:** Partial payment history object with fields to update

**Response:**
```json
{
  "message": "Payment history record updated successfully"
}
```

### DELETE /payment-history/:id 🔒
Delete a payment history record.

**Parameters:**
- `id` (path): Payment history record ID

**Response:**
```json
{
  "message": "Payment history record deleted successfully"
}
```

---

## Monthly Expenses

### GET /monthly-expenses
Get monthly expense data with optional filters.

**Query Parameters:**
- `start_year` (optional): Start year (default: current year)
- `start_month` (optional): Start month 1-12 (default: 1)
- `end_year` (optional): End year (default: current year)
- `end_month` (optional): End month 1-12 (default: 12)
- `currency` (optional): Return only specific currency amount

**Response:**
```json
{
  "expenses": [
    {
      "id": 28,
      "monthKey": "202506",
      "year": 2025,
      "month": 6,
      "paymentHistoryIds": [38, 2, 1, 11, 35, 9],
      "amounts": {
        "AUD": 25.02,
        "CAD": 22.33,
        "CNY": 170.22,
        "EUR": 13.98,
        "GBP": 12.04,
        "JPY": 2383.51,
        "USD": 23.77
      },
      "createdAt": "2025-07-03T23:45:56.000Z",
      "updatedAt": "2025-07-03T23:45:57.000Z"
    }
  ],
  "summary": {
    "totalRecords": 1,
    "dateRange": {
      "startYear": 2025,
      "startMonth": 6,
      "endYear": 2025,
      "endMonth": 6
    },
    "currency": "ALL"
  }
}
```

**With specific currency:**
```bash
GET /monthly-expenses?start_year=2025&start_month=6&end_month=6&currency=USD
```

**Response:**
```json
{
  "expenses": [
    {
      "id": 28,
      "monthKey": "202506",
      "year": 2025,
      "month": 6,
      "paymentHistoryIds": [38, 2, 1, 11, 35, 9],
      "amount": 23.77,
      "currency": "USD",
      "createdAt": "2025-07-03T23:45:56.000Z",
      "updatedAt": "2025-07-03T23:45:57.000Z"
    }
  ],
  "summary": {
    "totalRecords": 1,
    "dateRange": {
      "startYear": 2025,
      "startMonth": 6,
      "endYear": 2025,
      "endMonth": 6
    },
    "currency": "USD"
  }
}
```

### GET /monthly-expenses/:monthKey
Get detailed monthly expense data for a specific month.

**Parameters:**
- `monthKey` (path): Month key in format YYYYMM (e.g., "202506")

**Response:**
```json
{
  "id": 28,
  "monthKey": "202506",
  "year": 2025,
  "month": 6,
  "paymentHistoryIds": [38, 2, 1, 11, 35, 9],
  "amounts": {
    "AUD": 25.02,
    "CAD": 22.33,
    "CNY": 170.22,
    "EUR": 13.98,
    "GBP": 12.04,
    "JPY": 2383.51,
    "USD": 23.77
  },
  "paymentDetails": [
    {
      "id": 38,
      "subscriptionId": 19,
      "subscriptionName": "Spotify",
      "subscriptionPlan": "Premium",
      "paymentDate": "2024-10-15",
      "amountPaid": 9.99,
      "currency": "USD",
      "billingPeriod": {
        "start": "2024-10-15",
        "end": "2025-10-15"
      },
      "status": "succeeded"
    }
  ],
  "createdAt": "2025-07-03T23:45:56.000Z",
  "updatedAt": "2025-07-03T23:45:57.000Z"
}
```

### GET /monthly-expenses/summary/totals
Get monthly expenses summary and totals.

**Query Parameters:**
- `start_year` (optional): Start year (default: current year)
- `start_month` (optional): Start month 1-12 (default: 1)
- `end_year` (optional): End year (default: current year)
- `end_month` (optional): End month 1-12 (default: 12)
- `currency` (optional): Currency for calculations (default: USD)

**Response:**
```json
{
  "summary": {
    "totalAmount": 285.24,
    "currency": "USD",
    "monthCount": 12,
    "averageMonthly": 23.77,
    "dateRange": {
      "startYear": 2025,
      "startMonth": 1,
      "endYear": 2025,
      "endMonth": 12
    }
  },
  "monthlyTotals": [
    {
      "monthKey": "202501",
      "year": 2025,
      "month": 1,
      "amount": 16.42,
      "paymentCount": 7
    },
    {
      "monthKey": "202502",
      "year": 2025,
      "month": 2,
      "amount": 18.95,
      "paymentCount": 5
    }
  ]
}
```

### POST /monthly-expenses/recalculate 🔒
Recalculate all monthly expense data from payment history.

**Response:**
```json
{
  "message": "Monthly expenses recalculated successfully",
  "timestamp": "2025-07-04T00:00:00.000Z"
}
```

### POST /monthly-expenses/process-payment/:paymentId 🔒
Process a specific payment for monthly expenses calculation.

**Parameters:**
- `paymentId` (path): Payment history record ID

**Response:**
```json
{
  "message": "Payment 123 processed for monthly expenses",
  "timestamp": "2025-07-04T00:00:00.000Z"
}
```

### DELETE /monthly-expenses/:monthKey 🔒
Delete a monthly expense record.

**Parameters:**
- `monthKey` (path): Month key in format YYYYMM

**Response:**
```json
{
  "message": "Monthly expense record deleted successfully"
}
```

---

## Analytics

### GET /analytics/monthly-revenue
Get monthly revenue statistics.

**Query Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `currency` (optional): Filter by currency

**Response:**
```json
{
  "monthlyStats": [
    {
      "month": "2025-07",
      "currency": "USD",
      "totalRevenue": 97.96,
      "paymentCount": 4,
      "averagePayment": 24.49
    }
  ],
  "summary": {
    "totalMonths": 8,
    "totalRevenue": 570.94,
    "totalPayments": 20,
    "currencies": ["CNY", "USD"]
  },
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "currency": null
  }
}
```

### GET /analytics/monthly-active-subscriptions
Get active subscriptions for a specific month.

**Query Parameters:**
- `month` (required): Month (1-12)
- `year` (required): Year (2000-3000)

**Response:**
```json
{
  "targetMonth": "2025-07",
  "period": {
    "start": "2025-07-01",
    "end": "2025-07-31"
  },
  "activeSubscriptions": [
    {
      "id": 1,
      "name": "Netflix",
      "plan": "Premium",
      "amount": 15.99,
      "currency": "USD",
      "billingCycle": "monthly",
      "status": "active",
      "category": "video",
      "paymentCountInMonth": 1,
      "totalPaidInMonth": 15.99,
      "activePeriod": {
        "start": "2025-07-01",
        "end": "2025-08-01"
      }
    }
  ],
  "summary": {
    "totalActiveSubscriptions": 1,
    "totalRevenue": 15.99,
    "totalPayments": 1,
    "byCategory": {
      "video": { "count": 1, "revenue": 15.99 }
    },
    "byCurrency": {
      "USD": { "count": 1, "revenue": 15.99 }
    },
    "byBillingCycle": {
      "monthly": { "count": 1, "revenue": 15.99 }
    }
  }
}
```

---

## Settings

### GET /settings
Get application settings.

**Response:**
```json
{
  "id": 1,
  "currency": "USD",
  "theme": "dark",
  "created_at": "2025-07-01T00:00:00.000Z",
  "updated_at": "2025-07-01T00:00:00.000Z"
}
```

### PUT /settings 🔒
Update application settings.

**Request Body:**
```json
{
  "currency": "EUR",
  "theme": "light"
}
```

**Response:**
```json
{
  "message": "Settings updated successfully"
}
```

### POST /settings/reset 🔒
Reset settings to default values.

**Response:**
```json
{
  "message": "Settings have been reset to default."
}
```

---

## Exchange Rates

### GET /exchange-rates
Get all exchange rates.

**Response:**
```json
[
  {
    "id": 1,
    "from_currency": "USD",
    "to_currency": "EUR",
    "rate": 0.8488,
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-03T00:51:57.000Z"
  }
]
```

### GET /exchange-rates/:from/:to
Get specific exchange rate.

**Parameters:**
- `from` (path): Source currency code
- `to` (path): Target currency code

**Response:** Single exchange rate object

### POST /exchange-rates/update 🔒
Manually update exchange rates from external API.

**Response:**
```json
{
  "message": "Exchange rates updated successfully",
  "updatedAt": "2025-07-03T00:51:57.000Z"
}
```

### GET /exchange-rates/status 🔒
Get exchange rate scheduler status.

**Response:**
```json
{
  "isRunning": true,
  "lastUpdate": "2025-07-03T00:51:57.000Z",
  "nextUpdate": "2025-07-04T02:00:00.000Z",
  "schedule": "Daily at 2:00 AM CST"
}
```

---

## Categories

### GET /categories
Get all subscription categories.

**Response:**
```json
[
  {
    "id": 1,
    "value": "video",
    "label": "Video Streaming",
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "value": "music",
    "label": "Music Streaming",
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  }
]
```

### POST /categories 🔒
Create a new category.

**Request Body:**
```json
{
  "value": "fitness",
  "label": "Fitness & Health"
}
```

**Response:**
```json
{
  "id": 11,
  "value": "fitness",
  "label": "Fitness & Health",
  "message": "Category created successfully"
}
```

### PUT /categories/:value 🔒
Update a category.

**Parameters:**
- `value` (path): Category value

**Request Body:**
```json
{
  "value": "fitness",
  "label": "Fitness & Wellness"
}
```

**Response:**
```json
{
  "message": "Category updated successfully"
}
```

### DELETE /categories/:value 🔒
Delete a category.

**Parameters:**
- `value` (path): Category value

**Response:**
```json
{
  "message": "Category deleted successfully"
}
```

---

## Payment Methods

### GET /payment-methods
Get all payment methods.

**Response:**
```json
[
  {
    "id": 1,
    "value": "creditcard",
    "label": "Credit Card",
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "value": "paypal",
    "label": "PayPal",
    "created_at": "2025-07-01T00:00:00.000Z",
    "updated_at": "2025-07-01T00:00:00.000Z"
  }
]
```

### POST /payment-methods 🔒
Create a new payment method.

**Request Body:**
```json
{
  "value": "venmo",
  "label": "Venmo"
}
```

**Response:**
```json
{
  "id": 9,
  "value": "venmo",
  "label": "Venmo",
  "message": "Payment method created successfully"
}
```

### PUT /payment-methods/:value 🔒
Update a payment method.

**Parameters:**
- `value` (path): Payment method value

**Request Body:**
```json
{
  "value": "venmo",
  "label": "Venmo Pay"
}
```

**Response:**
```json
{
  "message": "Payment method updated successfully"
}
```

### DELETE /payment-methods/:value 🔒
Delete a payment method.

**Parameters:**
- `value` (path): Payment method value

**Response:**
```json
{
  "message": "Payment method deleted successfully"
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

---

## Data Types

### Billing Cycles
- `monthly` - Monthly billing
- `yearly` - Annual billing
- `quarterly` - Quarterly billing

### Subscription Status
- `active` - Active subscription
- `inactive` - Inactive subscription
- `cancelled` - Cancelled subscription

### Renewal Types
- `auto` - Automatic renewal
- `manual` - Manual renewal

### Payment Status
- `succeeded` - Payment successful
- `failed` - Payment failed
- `pending` - Payment pending
- `cancelled` - Payment cancelled

### Themes
- `light` - Light theme
- `dark` - Dark theme
- `system` - Follow system preference

---

## Notes

🔒 = Protected endpoint (requires API key)

- All dates are in ISO 8601 format (YYYY-MM-DD)
- All timestamps are in ISO 8601 format with timezone
- Currency codes follow ISO 4217 standard (USD, EUR, GBP, etc.)
- The API automatically calculates `last_billing_date` when creating or updating subscriptions
- Payment history records are automatically created for subscription renewals and reactivations
- Exchange rates are updated daily at 2:00 AM CST using the TianAPI service
- Monthly expenses are automatically calculated and updated when payment history changes
- Monthly expenses support prorated calculations for different billing cycles:
  - **Monthly subscriptions**: Allocated to the payment date month
  - **Quarterly subscriptions**: Prorated across 3 months from billing period start
  - **Yearly subscriptions**: Prorated across 12 months from billing period start
- All currency amounts in monthly expenses are automatically converted using current exchange rates

---

## Example Usage

### Creating a Subscription with cURL

```bash
curl -X POST http://localhost:3001/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "name": "Netflix",
    "plan": "Premium",
    "billing_cycle": "monthly",
    "next_billing_date": "2025-08-01",
    "amount": 15.99,
    "currency": "USD",
    "payment_method": "creditcard",
    "start_date": "2025-07-01",
    "status": "active",
    "category": "video",
    "renewal_type": "auto"
  }'
```

### Getting Monthly Revenue Analytics

```bash
curl "http://localhost:3001/api/analytics/monthly-revenue?start_date=2025-01-01&end_date=2025-12-31&currency=USD"
```

### Getting Monthly Expenses

```bash
# Get monthly expenses for 2025
curl "http://localhost:3001/api/monthly-expenses?start_year=2025&start_month=1&end_month=12"

# Get monthly expenses in USD only
curl "http://localhost:3001/api/monthly-expenses?start_year=2025&currency=USD"

# Get specific month details
curl "http://localhost:3001/api/monthly-expenses/202506"

# Get monthly expenses summary
curl "http://localhost:3001/api/monthly-expenses/summary/totals?start_year=2025&currency=USD"
```

### Recalculating Monthly Expenses

```bash
curl -X POST http://localhost:3001/protected-api/monthly-expenses/recalculate \
  -H "X-API-KEY: your-api-key"
```
