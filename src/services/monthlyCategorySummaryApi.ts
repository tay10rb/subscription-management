import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

// API响应类型定义
export interface MonthlyCategorySummaryApiResponse {
  year: number;
  month: number;
  monthKey: string;
  categoryId: number;
  categoryValue: string;
  categoryLabel: string;
  totalAmount: number;
  baseCurrency: string;
  transactionsCount: number;
  updatedAt: string;
}

export interface MonthCategorySummaryResponse {
  year: number;
  month: number;
  categories: CategorySummary[];
  totalAmount: number;
  totalTransactions: number;
  baseCurrency: string;
}

export interface CategorySummary {
  categoryId: number;
  categoryValue: string;
  categoryLabel: string;
  totalAmount: number;
  baseCurrency: string;
  transactionsCount: number;
  updatedAt: string;
}

export interface TotalSummaryResponse {
  dateRange: {
    startYear: number;
    startMonth: number;
    endYear: number;
    endMonth: number;
  };
  totalAmount: number;
  totalTransactions: number;
  baseCurrency: string;
}

export interface MonthlyCategorySummariesResponse {
  summaries: MonthlyCategorySummaryApiResponse[];
  summary: {
    totalRecords: number;
    dateRange: {
      startYear: number;
      startMonth: number;
      endYear: number;
      endMonth: number;
    };
  };
}

/**
 * 获取月度分类汇总数据
 */
export async function getMonthlyCategorySummaries(
  startYear?: number,
  startMonth?: number,
  endYear?: number,
  endMonth?: number
): Promise<MonthlyCategorySummariesResponse> {
  try {
    const params = new URLSearchParams();
    if (startYear) params.append('start_year', startYear.toString());
    if (startMonth) params.append('start_month', startMonth.toString());
    if (endYear) params.append('end_year', endYear.toString());
    if (endMonth) params.append('end_month', endMonth.toString());

    const url = `${API_BASE_URL}/monthly-category-summary?${params.toString()}`;
    logger.debug('Fetching monthly category summaries from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch monthly category summaries');
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching monthly category summaries:', error);
    throw error;
  }
}

/**
 * 获取指定月份的分类汇总
 */
export async function getMonthCategorySummary(
  year: number,
  month: number
): Promise<MonthCategorySummaryResponse> {
  try {
    const url = `${API_BASE_URL}/monthly-category-summary/${year}/${month}`;
    logger.debug('Fetching month category summary from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch month category summary');
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching month category summary:', error);
    throw error;
  }
}

/**
 * 获取总计汇总数据
 */
export async function getTotalSummary(
  startYear?: number,
  startMonth?: number,
  endYear?: number,
  endMonth?: number
): Promise<TotalSummaryResponse> {
  try {
    const params = new URLSearchParams();
    if (startYear) params.append('start_year', startYear.toString());
    if (startMonth) params.append('start_month', startMonth.toString());
    if (endYear) params.append('end_year', endYear.toString());
    if (endMonth) params.append('end_month', endMonth.toString());

    const url = `${API_BASE_URL}/monthly-category-summary/total?${params.toString()}`;
    logger.debug('Fetching total summary from:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch total summary');
    }

    return result.data;
  } catch (error) {
    logger.error('Error fetching total summary:', error);
    throw error;
  }
}

/**
 * 重新计算所有月度分类汇总数据
 */
export async function recalculateAllSummaries(): Promise<{ message: string; timestamp: string }> {
  try {
    const url = `${API_BASE_URL}/protected/monthly-category-summary/recalculate`;
    logger.debug('Recalculating all summaries at:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add API key if needed
        ...(getApiKey() && { 'X-API-KEY': getApiKey() })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to recalculate summaries');
    }

    return result.data;
  } catch (error) {
    logger.error('Error recalculating summaries:', error);
    throw error;
  }
}

/**
 * 处理新支付记录
 */
export async function processPayment(paymentId: number): Promise<{ message: string; paymentId: number; timestamp: string }> {
  try {
    const url = `${API_BASE_URL}/protected/monthly-category-summary/process-payment/${paymentId}`;
    logger.debug('Processing payment at:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add API key if needed
        ...(getApiKey() && { 'X-API-KEY': getApiKey() })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Failed to process payment');
    }

    return result.data;
  } catch (error) {
    logger.error('Error processing payment:', error);
    throw error;
  }
}

/**
 * 获取 API 密钥（如果需要的话）
 */
function getApiKey(): string | null {
  // 这里可以从设置存储或环境变量中获取 API 密钥
  // 暂时返回 null，表示不需要 API 密钥
  return null;
}
