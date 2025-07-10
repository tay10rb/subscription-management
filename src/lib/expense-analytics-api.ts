import {
  getMonthlyCategorySummaries,
  getMonthCategorySummary,
  getTotalSummary,
  type MonthlyCategorySummariesResponse,
  type MonthCategorySummaryResponse,
  type TotalSummaryResponse
} from '@/services/monthlyCategorySummaryApi';
import { convertCurrency } from '@/utils/currency';
import { getBaseCurrency } from '@/config/currency';

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
 * 将新的月度分类汇总数据转换为图表组件需要的格式
 */
export function transformMonthlyCategorySummaries(
  summariesResponse: MonthlyCategorySummariesResponse,
  targetCurrency: string
): MonthlyExpense[] {
  // 按月份分组汇总数据
  const monthlyMap = new Map<string, { amount: number; transactionCount: number }>();

  summariesResponse.summaries.forEach(summary => {
    const monthKey = summary.monthKey;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { amount: 0, transactionCount: 0 });
    }

    const monthData = monthlyMap.get(monthKey)!;
    // Convert from base currency to target currency
    const convertedAmount = convertCurrency(summary.totalAmount, getBaseCurrency(), targetCurrency);
    monthData.amount += convertedAmount;
    monthData.transactionCount += summary.transactionsCount;
  });

  // 转换为 MonthlyExpense 格式
  return Array.from(monthlyMap.entries())
    .map(([monthKey, data]) => {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // 格式化月份显示
      const date = new Date(year, month - 1);
      const monthDisplay = date.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      });

      return {
        monthKey,
        month: monthDisplay,
        year,
        amount: Math.round(data.amount * 100) / 100,
        subscriptionCount: data.transactionCount,
        paymentHistoryIds: Array.from({ length: data.transactionCount }, (_, i) => i + 1) // 生成支付ID数组用于计算支付数量
      };
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * 获取基于新API的月度费用数据
 */
export async function getApiMonthlyExpenses(
  startDate: Date,
  endDate: Date,
  currency: string // 保持兼容性，但新系统统一使用基础货币
): Promise<MonthlyExpense[]> {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  const response = await getMonthlyCategorySummaries(startYear, startMonth, endYear, endMonth);
  return transformMonthlyCategorySummaries(response, currency);
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
    const response = await getMonthCategorySummary(currentYear, currentMonth);
    // Convert from base currency to user's preferred currency
    const convertedAmount = convertCurrency(response.totalAmount, getBaseCurrency(), currency);
    return convertedAmount;
  } catch (error) {
    console.error('Failed to get current month spending:', error);
    return 0;
  }
}

/**
 * 获取当年总支出（只计算到当前月份）
 */
export async function getCurrentYearSpending(currency: string): Promise<number> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11, so add 1

  try {
    const response = await getTotalSummary(currentYear, 1, currentYear, currentMonth);
    // Convert from base currency to user's preferred currency
    const convertedAmount = convertCurrency(response.totalAmount, getBaseCurrency(), currency);
    return convertedAmount;
  } catch (error) {
    console.error('Failed to get current year spending:', error);
    return 0;
  }
}

/**
 * 从新API数据计算分类支出
 */
export function calculateCategoryExpensesFromNewApi(
  summariesResponse: MonthlyCategorySummariesResponse,
  targetCurrency: string = getBaseCurrency()
): CategoryExpense[] {
  const categoryMap = new Map<string, { amount: number; transactionCount: number }>();
  let totalAmount = 0;

  // 聚合所有月份的分类数据
  summariesResponse.summaries.forEach(summary => {
    const categoryLabel = summary.categoryLabel;
    // Convert from base currency to target currency
    const convertedAmount = convertCurrency(summary.totalAmount, getBaseCurrency(), targetCurrency);

    if (!categoryMap.has(categoryLabel)) {
      categoryMap.set(categoryLabel, { amount: 0, transactionCount: 0 });
    }

    const categoryData = categoryMap.get(categoryLabel)!;
    categoryData.amount += convertedAmount;
    categoryData.transactionCount += summary.transactionsCount;
    totalAmount += convertedAmount;
  });

  // 转换为CategoryExpense数组并计算百分比
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      subscriptionCount: data.transactionCount
    }))
    .sort((a, b) => b.amount - a.amount); // 按金额降序排列
}

/**
 * 获取基于新API的分类支出数据
 */
export async function getApiCategoryExpenses(
  startDate: Date,
  endDate: Date,
  currency: string
): Promise<CategoryExpense[]> {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  const response = await getMonthlyCategorySummaries(startYear, startMonth, endYear, endMonth);
  return calculateCategoryExpensesFromNewApi(response, currency);
}
