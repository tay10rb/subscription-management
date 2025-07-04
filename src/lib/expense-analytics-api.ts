import { MonthlyExpensesApi, MonthlyExpenseApiResponse, MonthlyExpensesSummaryResponse } from '@/services/monthlyExpensesApi';

// 适配API的数据类型定义
export interface MonthlyExpense {
  monthKey: string;
  month: string; // 格式化的月份显示，如 "Jun 2025"
  year: number;
  amount: number;
  subscriptionCount: number;
  paymentHistoryIds?: number[];
}

export interface ExpenseMetrics {
  totalSpent: number;
  averageMonthly: number;
  averagePerSubscription: number;
  highestMonth: MonthlyExpense | null;
  lowestMonth: MonthlyExpense | null;
  growthRate: number;
}

export interface YearlyExpense {
  year: number;
  amount: number;
  subscriptionCount: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  subscriptionCount: number;
}

export interface ExpenseTrend {
  period: string;
  amount: number;
  change: number;
  changePercentage: number;
}

/**
 * 将API响应的月度费用数据转换为图表组件需要的格式
 */
export function transformApiMonthlyExpenses(
  apiExpenses: MonthlyExpenseApiResponse[], 
  currency: string
): MonthlyExpense[] {
  return apiExpenses.map(expense => {
    // 获取指定货币的金额
    const amount = expense.currency === currency 
      ? expense.amount || 0
      : expense.amounts?.[currency] || 0;

    // 格式化月份显示
    const date = new Date(expense.year, expense.month - 1);
    const monthDisplay = date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });

    return {
      monthKey: expense.monthKey,
      month: monthDisplay,
      year: expense.year,
      amount,
      subscriptionCount: expense.paymentHistoryIds.length,
      paymentHistoryIds: expense.paymentHistoryIds
    };
  });
}

/**
 * 从API汇总数据计算费用指标
 */
export function calculateExpenseMetricsFromApi(
  summaryData: MonthlyExpensesSummaryResponse,
  monthlyExpenses: MonthlyExpense[]
): ExpenseMetrics {
  const { summary } = summaryData;

  // 计算每个订阅的平均费用
  // 方法：总支出 ÷ 总支付次数 = 每次支付的平均金额
  // 注意：这个值表示每次支付的平均金额，不是每个订阅每月的费用
  // 因为不同订阅有不同的计费周期（月付、季付、年付）
  const totalPaymentCount = summaryData.monthlyTotals.reduce((sum, month) => sum + month.paymentCount, 0);
  const averagePerSubscription = totalPaymentCount > 0
    ? summary.totalAmount / totalPaymentCount
    : 0;

  // 找到最高和最低月份
  const highestMonth = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((max, month) => month.amount > max.amount ? month : max)
    : null;

  const lowestMonth = monthlyExpenses.length > 0
    ? monthlyExpenses.reduce((min, month) => month.amount < min.amount ? month : min)
    : null;

  // 计算增长率（第一个月vs最后一个月）
  const growthRate = monthlyExpenses.length >= 2
    ? ((monthlyExpenses[monthlyExpenses.length - 1].amount - monthlyExpenses[0].amount) / monthlyExpenses[0].amount) * 100
    : 0;

  return {
    totalSpent: summary.totalAmount,
    averageMonthly: summary.averageMonthly,
    averagePerSubscription,
    highestMonth,
    lowestMonth,
    growthRate
  };
}

/**
 * 获取基于API的月度费用数据
 */
export async function getApiMonthlyExpenses(
  startDate: Date,
  endDate: Date,
  currency: string
): Promise<MonthlyExpense[]> {
  const params = {
    start_year: startDate.getFullYear(),
    start_month: startDate.getMonth() + 1,
    end_year: endDate.getFullYear(),
    end_month: endDate.getMonth() + 1,
    currency
  };

  const response = await MonthlyExpensesApi.getMonthlyExpenses(params);
  return transformApiMonthlyExpenses(response.expenses, currency);
}

/**
 * 获取基于API的费用指标
 * 注意：由于API限制，averagePerSubscription使用简化计算方法
 */
export async function getApiExpenseMetrics(
  startDate: Date,
  endDate: Date,
  currency: string
): Promise<ExpenseMetrics> {
  const params = {
    start_year: startDate.getFullYear(),
    start_month: startDate.getMonth() + 1,
    end_year: endDate.getFullYear(),
    end_month: endDate.getMonth() + 1,
    currency
  };

  const [summaryResponse, monthlyExpenses] = await Promise.all([
    MonthlyExpensesApi.getMonthlyExpensesSummary(params),
    getApiMonthlyExpenses(startDate, endDate, currency)
  ]);

  return calculateExpenseMetricsFromApi(summaryResponse, monthlyExpenses);
}

/**
 * 获取基于API的费用指标（使用详细支付数据）
 * 通过分析实际支付记录来计算更准确的averagePerSubscription
 */
export async function getApiExpenseMetricsWithSubscriptions(
  startDate: Date,
  endDate: Date,
  currency: string
): Promise<ExpenseMetrics> {
  const params = {
    start_year: startDate.getFullYear(),
    start_month: startDate.getMonth() + 1,
    end_year: endDate.getFullYear(),
    end_month: endDate.getMonth() + 1,
    currency
  };

  const [summaryResponse, monthlyExpenses] = await Promise.all([
    MonthlyExpensesApi.getMonthlyExpensesSummary(params),
    getApiMonthlyExpenses(startDate, endDate, currency)
  ]);

  const metrics = calculateExpenseMetricsFromApi(summaryResponse, monthlyExpenses);

  // 尝试获取详细支付数据来计算更准确的averagePerSubscription
  try {
    const uniqueSubscriptionMonths = new Set<string>();

    // 为每个月获取详细数据来统计实际的订阅-月组合
    for (const expense of monthlyExpenses) {
      try {
        const detailData = await MonthlyExpensesApi.getMonthlyExpenseDetail(expense.monthKey);
        if (detailData.paymentDetails) {
          detailData.paymentDetails.forEach(payment => {
            // 创建订阅-月的唯一标识
            uniqueSubscriptionMonths.add(`${payment.subscriptionId}-${expense.monthKey}`);
          });
        }
      } catch (error) {
        console.warn(`Failed to get detail for ${expense.monthKey}:`, error);
      }
    }

    // 如果成功获取到详细数据，使用更精确的计算
    if (uniqueSubscriptionMonths.size > 0) {
      metrics.averagePerSubscription = summaryResponse.summary.totalAmount / uniqueSubscriptionMonths.size;
    }
  } catch (error) {
    console.warn('Failed to calculate precise averagePerSubscription, using fallback method');
  }

  return metrics;
}

/**
 * 计算年度费用数据（从月度数据聚合）
 */
export function calculateYearlyExpensesFromMonthly(monthlyExpenses: MonthlyExpense[]): YearlyExpense[] {
  const yearlyMap = new Map<number, { amount: number; subscriptions: Set<number> }>();

  monthlyExpenses.forEach(expense => {
    if (!yearlyMap.has(expense.year)) {
      yearlyMap.set(expense.year, { amount: 0, subscriptions: new Set() });
    }

    const yearData = yearlyMap.get(expense.year)!;
    yearData.amount += expense.amount;
    
    // 添加支付历史ID到订阅集合中
    if (expense.paymentHistoryIds) {
      expense.paymentHistoryIds.forEach(id => yearData.subscriptions.add(id));
    }
  });

  return Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      amount: data.amount,
      subscriptionCount: data.subscriptions.size
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * 计算费用趋势
 */
export function calculateExpenseTrends(monthlyExpenses: MonthlyExpense[]): ExpenseTrend[] {
  return monthlyExpenses.map((current, index) => {
    const previous = index > 0 ? monthlyExpenses[index - 1] : null;
    const change = previous ? current.amount - previous.amount : 0;
    const changePercentage = previous && previous.amount > 0
      ? ((current.amount - previous.amount) / previous.amount) * 100
      : 0;

    return {
      period: current.month,
      amount: current.amount,
      change,
      changePercentage
    };
  });
}

/**
 * 获取当月支出
 */
export async function getCurrentMonthSpending(currency: string): Promise<number> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  try {
    const params = {
      start_year: currentYear,
      start_month: currentMonth,
      end_year: currentYear,
      end_month: currentMonth,
      currency
    };

    const response = await MonthlyExpensesApi.getMonthlyExpenses(params);

    if (response.expenses.length > 0) {
      const expense = response.expenses[0];
      return expense.currency === currency
        ? expense.amount || 0
        : expense.amounts?.[currency] || 0;
    }

    return 0;
  } catch (error) {
    console.error('Failed to get current month spending:', error);
    return 0;
  }
}

/**
 * 获取当年总支出
 */
export async function getCurrentYearSpending(currency: string): Promise<number> {
  const now = new Date();
  const currentYear = now.getFullYear();

  try {
    const params = {
      start_year: currentYear,
      start_month: 1,
      end_year: currentYear,
      end_month: 12,
      currency
    };

    const summaryResponse = await MonthlyExpensesApi.getMonthlyExpensesSummary(params);
    return summaryResponse.summary.totalAmount;
  } catch (error) {
    console.error('Failed to get current year spending:', error);
    return 0;
  }
}
