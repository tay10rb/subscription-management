import { logger } from '@/utils/logger';
import { getBaseCurrency, isBaseCurrency } from '@/config/currency';
import { apiClient } from '@/utils/api-client';

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
      return await apiClient.get<ExchangeRate[]>('/exchange-rates');
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
      return await apiClient.get<ExchangeRate>(`/exchange-rates/${fromCurrency}/${toCurrency}`);
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
      // Temporarily set the API key in localStorage for this request
      const persistedState = localStorage.getItem('settings-storage');
      let oldApiKey: string | null = null;
      
      if (persistedState) {
        try {
          const parsed = JSON.parse(persistedState);
          oldApiKey = parsed.state?.apiKey || null;
          parsed.state = { ...parsed.state, apiKey };
          localStorage.setItem('settings-storage', JSON.stringify(parsed));
        } catch (e) {
          // If parsing fails, create a new state
          localStorage.setItem('settings-storage', JSON.stringify({ state: { apiKey } }));
        }
      } else {
        localStorage.setItem('settings-storage', JSON.stringify({ state: { apiKey } }));
      }
      
      const result = await apiClient.post<{ message: string; updatedAt: string }>('/protected/exchange-rates/update');
      
      // Restore old API key
      if (persistedState && oldApiKey !== apiKey) {
        try {
          const parsed = JSON.parse(persistedState);
          if (oldApiKey) {
            parsed.state = { ...parsed.state, apiKey: oldApiKey };
          } else {
            delete parsed.state.apiKey;
          }
          localStorage.setItem('settings-storage', JSON.stringify(parsed));
        } catch (e) {
          // Ignore restore errors
        }
      }
      
      return result;
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
      // Temporarily set the API key in localStorage for this request
      const persistedState = localStorage.getItem('settings-storage');
      let oldApiKey: string | null = null;
      
      if (persistedState) {
        try {
          const parsed = JSON.parse(persistedState);
          oldApiKey = parsed.state?.apiKey || null;
          parsed.state = { ...parsed.state, apiKey };
          localStorage.setItem('settings-storage', JSON.stringify(parsed));
        } catch (e) {
          // If parsing fails, create a new state
          localStorage.setItem('settings-storage', JSON.stringify({ state: { apiKey } }));
        }
      } else {
        localStorage.setItem('settings-storage', JSON.stringify({ state: { apiKey } }));
      }
      
      const result = await apiClient.get<ExchangeRateStatus>('/exchange-rates/status');
      
      // Restore old API key
      if (persistedState && oldApiKey !== apiKey) {
        try {
          const parsed = JSON.parse(persistedState);
          if (oldApiKey) {
            parsed.state = { ...parsed.state, apiKey: oldApiKey };
          } else {
            delete parsed.state.apiKey;
          }
          localStorage.setItem('settings-storage', JSON.stringify(parsed));
        } catch (e) {
          // Ignore restore errors
        }
      }
      
      return result;
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
    const baseCurrency = getBaseCurrency();

    for (const rate of rates) {
      // 使用 from_currency 作为键，rate 作为值
      // 这样可以直接查找从基础货币到其他货币的汇率
      if (rate.from_currency === baseCurrency) {
        rateMap[rate.to_currency] = rate.rate;
      }
    }

    // 确保基础货币到自身的汇率为1
    rateMap[baseCurrency] = 1;

    return rateMap;
  }
}
