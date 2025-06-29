# 自动续费功能 (Auto Renewal Feature)

## 概述

自动续费功能会在页面加载时自动检查所有到期的订阅，并更新它们的计费日期。这确保了订阅数据的准确性，并正确显示在"Recently Paid"和"Upcoming Renewals"部分。

## 功能特性

### 1. 自动检测到期订阅
- 检查所有状态为"active"的订阅
- 识别`nextBillingDate`为今天或已过期的订阅
- 使用精确的日期比较（忽略时分秒）

### 2. 自动更新订阅日期
- 将`lastBillingDate`设置为今天
- 根据计费周期计算新的`nextBillingDate`：
  - **Monthly**: 下个月同一天
  - **Yearly**: 下一年同一天
  - **Quarterly**: 下个季度同一天

### 3. 前端集成
- 在HomePage组件加载时自动执行
- 处理完成后自动刷新订阅数据
- 提供详细的日志记录

## 技术实现

### 核心函数

#### `isSubscriptionDue(nextBillingDate: string): boolean`
检查订阅是否到期：
```javascript
function isSubscriptionDue(nextBillingDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置为当天开始时间
  
  const billingDate = new Date(nextBillingDate);
  billingDate.setHours(0, 0, 0, 0); // 设置为当天开始时间
  
  return billingDate <= today; // 今天或已过期
}
```

#### `processSubscriptionRenewal(subscription: Subscription)`
处理订阅续费：
```javascript
function processSubscriptionRenewal(subscription) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // 基于当前nextBillingDate计算新的nextBillingDate
  const currentNextBilling = new Date(subscription.nextBillingDate);
  const newNextBilling = calculateNextBillingDate(currentNextBilling, subscription.billingCycle);
  
  return {
    lastBillingDate: todayStr,
    nextBillingDate: newNextBilling
  };
}
```

### Store集成

在`subscriptionStore.ts`中添加了`processAutoRenewals`函数：
- 查找所有到期的活跃订阅
- 批量处理续费
- 返回处理结果统计

### 前端调用

在`HomePage.tsx`的`useEffect`中自动调用：
```javascript
useEffect(() => {
  const initializeData = async () => {
    await fetchSubscriptions();
    await fetchSettings();
    
    // 处理自动续费
    const result = await processAutoRenewals();
    if (result.processed > 0) {
      console.log(`Auto-renewed ${result.processed} subscription(s)`);
      await fetchSubscriptions(); // 刷新数据
    }
  };
  
  initializeData();
}, []);
```

## API端点

### POST `/api/subscriptions/auto-renew`
手动触发自动续费处理的API端点。

**响应格式：**
```json
{
  "message": "Auto renewal complete: 2 processed, 0 errors",
  "processed": 2,
  "errors": 0,
  "renewedSubscriptions": [
    {
      "id": 13,
      "name": "Test Auto Renewal",
      "oldNextBilling": "2025-06-28",
      "newLastBilling": "2025-06-29",
      "newNextBilling": "2025-07-28"
    }
  ]
}
```

## 测试

### 测试页面
创建了`test-auto-renewal.html`用于测试自动续费功能：
- 显示所有订阅及其到期状态
- 提供手动触发自动续费的按钮
- 实时日志显示处理过程

### 测试数据
可以通过以下脚本创建测试订阅：
```javascript
// 创建昨天到期的测试订阅
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];
```

## 使用场景

1. **页面加载时**: 自动检查并处理到期订阅
2. **手动触发**: 通过API端点手动处理
3. **定时任务**: 可以集成到定时任务中定期执行

## 日志记录

系统会记录以下信息：
- 找到的到期订阅数量
- 每个订阅的处理结果
- 处理统计（成功/失败数量）
- 错误详情

## 注意事项

1. **时区处理**: 所有日期比较都使用本地时区
2. **错误处理**: 单个订阅处理失败不会影响其他订阅
3. **数据一致性**: 处理完成后会自动刷新前端数据
4. **性能**: 只处理状态为"active"的订阅，提高效率

## 未来改进

1. **邮件通知**: 续费时发送邮件通知
2. **批量处理**: 优化数据库操作，使用事务
3. **配置选项**: 允许用户配置自动续费行为
4. **审计日志**: 记录所有续费操作的详细日志
