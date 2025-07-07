import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

export interface ExchangeRateStatus {
  isRunning: boolean;
  nextRun: string | null;
  hasApiKey: boolean;
}

/**
 * 汇率API服务
 */
export class ExchangeRateApi {
  /**
   * 获取所有汇率
   */
  static async getAllRates(): Promise<ExchangeRate[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle new unified response format
      if (result.success && result.data) {
        return result.data;
      } else if (Array.isArray(result)) {
        // Fallback for old format
        return result;
      } else {
        throw new Error(result.message || 'Failed to fetch exchange rates');
      }
    } catch (error) {
      logger.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * 获取特定汇率
   */
  static async getRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates/${fromCurrency}/${toCurrency}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange rate: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle new unified response format
      if (result.success && result.data) {
        return result.data;
      } else if (result.id) {
        // Fallback for old format
        return result;
      } else {
        throw new Error(result.message || 'Failed to fetch exchange rate');
      }
    } catch (error) {
      logger.error(`Error fetching exchange rate ${fromCurrency}->${toCurrency}:`, error);
      throw error;
    }
  }

  /**
   * 手动触发汇率更新
   */
  static async updateRates(apiKey: string): Promise<{ message: string; updatedAt: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update exchange rates: ${response.statusText}`);
      }
      
      const result = await response.json();

      // Handle new unified response format
      if (result.success && result.data) {
        return result.data;
      } else if (result.message) {
        // Fallback for old format or direct message
        return result;
      } else {
        throw new Error('Failed to update exchange rates');
      }
    } catch (error) {
      logger.error('Error updating exchange rates:', error);
      throw error;
    }
  }

  /**
   * 获取汇率调度器状态
   */
  static async getSchedulerStatus(apiKey: string): Promise<ExchangeRateStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/exchange-rates/status`, {
        headers: {
          'X-API-KEY': apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scheduler status: ${response.statusText}`);
      }
      
      const result = await response.json();

      // Handle new unified response format
      if (result.success && result.data) {
        return result.data;
      } else if (result.isRunning !== undefined) {
        // Fallback for old format
        return result;
      } else {
        throw new Error(result.message || 'Failed to fetch scheduler status');
      }
    } catch (error) {
      logger.error('Error fetching scheduler status:', error);
      throw error;
    }
  }

  /**
   * 将汇率数组转换为汇率映射对象
   */
  static ratesToMap(rates: ExchangeRate[]): Record<string, number> {
    const rateMap: Record<string, number> = {};
    
    for (const rate of rates) {
      // 使用 from_currency 作为键，rate 作为值
      // 这样可以直接查找从USD到其他货币的汇率
      if (rate.from_currency === 'USD') {
        rateMap[rate.to_currency] = rate.rate;
      }
    }
    
    // 确保USD到USD的汇率为1
    rateMap['USD'] = 1;
    
    return rateMap;
  }
}
