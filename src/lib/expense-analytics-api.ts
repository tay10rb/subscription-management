import { MonthlyExpensesApi, MonthlyExpenseApiResponse, MonthlyExpensesSummaryResponse, CategoryBreakdownData } from '@/services/monthlyExpensesApi';

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

/**
 * 从API数据计算分类支出
 */
export function calculateCategoryExpensesFromApi(
  apiExpenses: MonthlyExpenseApiResponse[],
  currency: string
): CategoryExpense[] {
  const categoryMap = new Map<string, { amount: number; paymentIds: Set<number> }>();
  let totalAmount = 0;

  // 聚合所有月份的分类数据
  apiExpenses.forEach(expense => {
    const categoryBreakdown = expense.categoryBreakdown || {};

    Object.entries(categoryBreakdown).forEach(([category, data]) => {
      // 获取指定货币的金额
      const amount = expense.currency === currency
        ? data.amount || 0
        : data.amounts?.[currency] || 0;

      if (amount > 0) {
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { amount: 0, paymentIds: new Set() });
        }

        const categoryData = categoryMap.get(category)!;
        categoryData.amount += amount;

        // 添加支付ID
        data.payment_ids.forEach(id => categoryData.paymentIds.add(id));

        totalAmount += amount;
      }
    });
  });

  // 转换为CategoryExpense数组并计算百分比
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      subscriptionCount: data.paymentIds.size
    }))
    .sort((a, b) => b.amount - a.amount); // 按金额降序排列
}

/**
 * 获取基于API的分类支出数据
 */
export async function getApiCategoryExpenses(
  startDate: Date,
  endDate: Date,
  currency: string
): Promise<CategoryExpense[]> {
  const params = {
    start_year: startDate.getFullYear(),
    start_month: startDate.getMonth() + 1,
    end_year: endDate.getFullYear(),
    end_month: endDate.getMonth() + 1,
    currency
  };

  const response = await MonthlyExpensesApi.getMonthlyExpenses(params);
  return calculateCategoryExpensesFromApi(response.expenses, currency);
}
