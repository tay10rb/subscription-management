import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// API响应类型定义
export interface MonthlyExpenseApiResponse {
  id: number;
  monthKey: string;
  year: number;
  month: number;
  paymentHistoryIds: number[];
  amounts?: Record<string, number>; // 多货币模式
  amount?: number; // 单货币模式
  currency?: string; // 单货币模式
  categoryBreakdown?: CategoryBreakdownData; // 分类明细
  paymentDetails?: PaymentDetail[];
  createdAt: string;
  updatedAt: string;
}

// 分类明细数据类型
export interface CategoryBreakdownData {
  [category: string]: {
    payment_ids: number[];
    amounts: Record<string, number>;
    amount?: number; // 单货币模式下的金额
    currency?: string; // 单货币模式下的货币
  };
}

export interface PaymentDetail {
  id: number;
  subscriptionId: number;
  subscriptionName: string;
  subscriptionPlan: string;
  paymentDate: string;
  amountPaid: number;
  currency: string;
  billingPeriod: {
    start: string;
    end: string;
  };
  status: string;
}

export interface MonthlyExpensesListResponse {
  expenses: MonthlyExpenseApiResponse[];
  summary: {
    totalRecords: number;
    dateRange: {
      startYear: number;
      startMonth: number;
      endYear: number;
      endMonth: number;
    };
    currency: string;
  };
}

export interface MonthlyExpensesSummaryResponse {
  summary: {
    totalAmount: number;
    currency: string;
    monthCount: number;
    averageMonthly: number;
    dateRange: {
      startYear: number;
      startMonth: number;
      endYear: number;
      endMonth: number;
    };
  };
  monthlyTotals: Array<{
    monthKey: string;
    year: number;
    month: number;
    amount: number;
    paymentCount: number;
  }>;
}

export interface MonthlyExpensesQueryParams {
  start_year?: number;
  start_month?: number;
  end_year?: number;
  end_month?: number;
  currency?: string;
}

/**
 * Monthly Expenses API服务
 */
export class MonthlyExpensesApi {
  /**
   * 获取月度费用数据
   */
  static async getMonthlyExpenses(params: MonthlyExpensesQueryParams = {}): Promise<MonthlyExpensesListResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.start_year) searchParams.append('start_year', params.start_year.toString());
      if (params.start_month) searchParams.append('start_month', params.start_month.toString());
      if (params.end_year) searchParams.append('end_year', params.end_year.toString());
      if (params.end_month) searchParams.append('end_month', params.end_month.toString());
      if (params.currency) searchParams.append('currency', params.currency);

      const url = `${API_BASE_URL}/monthly-expenses${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly expenses: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Error fetching monthly expenses:', error);
      throw error;
    }
  }

  /**
   * 获取特定月份的详细费用数据
   */
  static async getMonthlyExpenseDetail(monthKey: string): Promise<MonthlyExpenseApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-expenses/${monthKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly expense detail: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error(`Error fetching monthly expense detail for ${monthKey}:`, error);
      throw error;
    }
  }

  /**
   * 获取月度费用汇总和总计
   */
  static async getMonthlyExpensesSummary(params: MonthlyExpensesQueryParams = {}): Promise<MonthlyExpensesSummaryResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.start_year) searchParams.append('start_year', params.start_year.toString());
      if (params.start_month) searchParams.append('start_month', params.start_month.toString());
      if (params.end_year) searchParams.append('end_year', params.end_year.toString());
      if (params.end_month) searchParams.append('end_month', params.end_month.toString());
      if (params.currency) searchParams.append('currency', params.currency);

      const url = `${API_BASE_URL}/monthly-expenses/summary/totals${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly expenses summary: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('Error fetching monthly expenses summary:', error);
      throw error;
    }
  }

  /**
   * 重新计算所有月度费用数据 (需要API密钥)
   */
  static async recalculateMonthlyExpenses(apiKey: string): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-expenses/recalculate`, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to recalculate monthly expenses: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error recalculating monthly expenses:', error);
      throw error;
    }
  }

  /**
   * 处理特定支付记录的月度费用计算 (需要API密钥)
   */
  static async processPayment(paymentId: number, apiKey: string): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-expenses/process-payment/${paymentId}`, {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to process payment: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Error processing payment ${paymentId}:`, error);
      throw error;
    }
  }

  /**
   * 删除月度费用记录 (需要API密钥)
   */
  static async deleteMonthlyExpense(monthKey: string, apiKey: string): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-expenses/${monthKey}`, {
        method: 'DELETE',
        headers: {
          'X-API-KEY': apiKey
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete monthly expense: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`Error deleting monthly expense ${monthKey}:`, error);
      throw error;
    }
  }
}
