# API 使用示例

本文档提供了 server 模块各个 API 端点的详细使用示例，展示了重构后的统一响应格式和错误处理。

## 通用响应格式

### 成功响应
```json
{
    "success": true,
    "message": "Operation completed successfully",
    "data": { /* 响应数据 */ }
}
```

### 错误响应
```json
{
    "success": false,
    "message": "Error description",
    "error": true,
    "errors": [ /* 详细错误信息 */ ]
}
```

## 订阅管理 API

### 1. 获取所有订阅

**请求**
```http
GET /api/subscriptions
```

**响应**
```json
{
    "success": true,
    "message": "Subscriptions retrieved successfully",
    "data": [
        {
            "id": 1,
            "name": "Netflix",
            "plan": "Premium",
            "billing_cycle": "monthly",
            "amount": 15.99,
            "currency": "USD",
            "status": "active",
            "next_billing_date": "2024-02-01",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### 2. 创建新订阅

**请求**
```http
POST /api/protected/subscriptions
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "name": "Spotify",
    "plan": "Individual",
    "billing_cycle": "monthly",
    "amount": 9.99,
    "currency": "USD",
    "payment_method": "credit_card",
    "start_date": "2024-01-01",
    "next_billing_date": "2024-02-01",
    "category": "music",
    "status": "active",
    "renewal_type": "auto"
}
```

**成功响应**
```json
{
    "success": true,
    "message": "Subscription created successfully",
    "data": {
        "id": 2
    }
}
```

**验证错误响应**
```json
{
    "success": false,
    "message": "Validation failed",
    "error": true,
    "errors": [
        {
            "field": "amount",
            "message": "amount must be a number"
        },
        {
            "field": "billing_cycle",
            "message": "billing_cycle must be one of: monthly, yearly, quarterly"
        }
    ]
}
```

### 3. 更新订阅

**请求**
```http
PUT /api/protected/subscriptions/1
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "amount": 17.99,
    "plan": "Premium Plus"
}
```

**响应**
```json
{
    "success": true,
    "message": "Subscription updated successfully",
    "data": null
}
```

### 4. 删除订阅

**请求**
```http
DELETE /api/protected/subscriptions/1
Authorization: Bearer your-api-key
```

**响应**
```json
{
    "success": true,
    "message": "Subscription deleted successfully",
    "data": null
}
```

## 支付历史 API

### 1. 获取支付历史

**请求**
```http
GET /api/payment-history?subscription_id=1&limit=10&offset=0
```

**响应**
```json
{
    "success": true,
    "message": "Payment history retrieved successfully",
    "data": [
        {
            "id": 1,
            "subscription_id": 1,
            "subscription_name": "Netflix",
            "subscription_plan": "Premium",
            "payment_date": "2024-01-01",
            "amount_paid": 15.99,
            "currency": "USD",
            "status": "succeeded",
            "billing_period_start": "2024-01-01",
            "billing_period_end": "2024-02-01",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### 2. 获取月度统计

**请求**
```http
GET /api/payment-history/stats/monthly?year=2024&month=1
```

**响应**
```json
{
    "success": true,
    "message": "Monthly payment statistics retrieved successfully",
    "data": [
        {
            "total_payments": 5,
            "total_amount": 79.95,
            "successful_payments": 5,
            "failed_payments": 0,
            "currency": "USD",
            "avg_payment_amount": 15.99
        }
    ]
}
```

### 3. 创建支付记录

**请求**
```http
POST /api/protected/payment-history
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "subscription_id": 1,
    "payment_date": "2024-01-01",
    "amount_paid": 15.99,
    "currency": "USD",
    "billing_period_start": "2024-01-01",
    "billing_period_end": "2024-02-01",
    "status": "succeeded",
    "notes": "Monthly payment"
}
```

**响应**
```json
{
    "success": true,
    "message": "Payment record created successfully",
    "data": {
        "id": 10
    }
}
```

## 分类和支付方式 API

### 1. 获取分类列表

**请求**
```http
GET /api/categories
```

**响应**
```json
{
    "success": true,
    "message": "Categories retrieved successfully",
    "data": [
        {
            "id": 1,
            "value": "streaming",
            "label": "Streaming",
            "created_at": "2024-01-01T00:00:00.000Z"
        },
        {
            "id": 2,
            "value": "productivity",
            "label": "Productivity",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

### 2. 创建新分类

**请求**
```http
POST /api/protected/categories
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "value": "gaming",
    "label": "Gaming"
}
```

**响应**
```json
{
    "success": true,
    "message": "Category created successfully",
    "data": {
        "id": 10
    }
}
```

### 3. 获取支付方式列表

**请求**
```http
GET /api/payment-methods
```

**响应**
```json
{
    "success": true,
    "message": "Payment methods retrieved successfully",
    "data": [
        {
            "id": 1,
            "value": "credit_card",
            "label": "Credit Card",
            "created_at": "2024-01-01T00:00:00.000Z"
        },
        {
            "id": 2,
            "value": "paypal",
            "label": "PayPal",
            "created_at": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

## 错误处理示例

### 1. 资源未找到

**请求**
```http
GET /api/subscriptions/999
```

**响应**
```json
{
    "success": false,
    "message": "Subscription not found",
    "error": true
}
```

### 2. 验证错误

**请求**
```http
POST /api/protected/subscriptions
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "name": "",
    "amount": -10,
    "billing_cycle": "invalid"
}
```

**响应**
```json
{
    "success": false,
    "message": "Validation failed",
    "error": true,
    "errors": [
        {
            "field": "name",
            "message": "name is required"
        },
        {
            "field": "amount",
            "message": "amount must be at least 0"
        },
        {
            "field": "billing_cycle",
            "message": "billing_cycle must be one of: monthly, yearly, quarterly"
        }
    ]
}
```

### 3. 认证错误

**请求**
```http
POST /api/protected/subscriptions
Content-Type: application/json
```

**响应**
```json
{
    "success": false,
    "message": "Unauthorized access",
    "error": true
}
```

### 4. 冲突错误

**请求**
```http
POST /api/protected/categories
Content-Type: application/json
Authorization: Bearer your-api-key

{
    "value": "streaming",
    "label": "Streaming Services"
}
```

**响应**
```json
{
    "success": false,
    "message": "Category with this value already exists",
    "error": true
}
```

## 批量操作示例

### 1. 批量创建订阅

**请求**
```http
POST /api/protected/subscriptions/bulk
Content-Type: application/json
Authorization: Bearer your-api-key

[
    {
        "name": "Netflix",
        "plan": "Premium",
        "billing_cycle": "monthly",
        "amount": 15.99,
        "currency": "USD",
        "payment_method": "credit_card",
        "start_date": "2024-01-01",
        "next_billing_date": "2024-02-01",
        "category": "streaming"
    },
    {
        "name": "Spotify",
        "plan": "Individual",
        "billing_cycle": "monthly",
        "amount": 9.99,
        "currency": "USD",
        "payment_method": "paypal",
        "start_date": "2024-01-01",
        "next_billing_date": "2024-02-01",
        "category": "music"
    }
]
```

**响应**
```json
{
    "success": true,
    "message": "Subscriptions created successfully",
    "data": [
        { "lastInsertRowid": 1, "changes": 1 },
        { "lastInsertRowid": 2, "changes": 1 }
    ]
}
```

## 搜索和过滤示例

### 1. 搜索订阅

**请求**
```http
GET /api/subscriptions/search?q=netflix
```

**响应**
```json
{
    "success": true,
    "message": "Search results retrieved successfully",
    "data": [
        {
            "id": 1,
            "name": "Netflix",
            "plan": "Premium",
            "billing_cycle": "monthly",
            "amount": 15.99,
            "currency": "USD",
            "status": "active"
        }
    ]
}
```

### 2. 按状态过滤

**请求**
```http
GET /api/subscriptions/status/active
```

**响应**
```json
{
    "success": true,
    "message": "Subscriptions by status retrieved successfully",
    "data": [
        /* 活跃订阅列表 */
    ]
}
```

### 3. 按分类过滤

**请求**
```http
GET /api/subscriptions/category/streaming
```

**响应**
```json
{
    "success": true,
    "message": "Subscriptions by category retrieved successfully",
    "data": [
        /* 流媒体订阅列表 */
    ]
}
```

## 统计数据示例

### 1. 订阅概览统计

**请求**
```http
GET /api/subscriptions/stats/overview
```

**响应**
```json
{
    "success": true,
    "message": "Subscription statistics retrieved successfully",
    "data": {
        "total": {
            "total": 10,
            "active": 8,
            "inactive": 1,
            "cancelled": 1,
            "total_active_amount": 159.90,
            "avg_active_amount": 19.99
        },
        "byCategory": [
            {
                "category": "streaming",
                "count": 3,
                "total_amount": 47.97
            },
            {
                "category": "productivity",
                "count": 2,
                "total_amount": 29.98
            }
        ],
        "byBillingCycle": [
            {
                "billing_cycle": "monthly",
                "count": 7,
                "total_amount": 119.93
            },
            {
                "billing_cycle": "yearly",
                "count": 1,
                "total_amount": 39.97
            }
        ]
    }
}
```

这些示例展示了重构后的 API 具有：
- **一致的响应格式**
- **详细的错误信息**
- **完整的数据验证**
- **标准化的状态码**
- **清晰的成功/失败指示**
