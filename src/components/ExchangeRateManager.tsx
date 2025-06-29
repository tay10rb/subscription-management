import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { ExchangeRateApi, ExchangeRateStatus } from '@/services/exchangeRateApi';
import { formatCurrencyAmount } from '@/utils/currency';

export function ExchangeRateManager() {
  const { 
    exchangeRates, 
    lastExchangeRateUpdate, 
    apiKey,
    fetchExchangeRates,
    updateExchangeRatesFromApi 
  } = useSettingsStore();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<ExchangeRateStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // 获取调度器状态
  const fetchSchedulerStatus = async () => {
    if (!apiKey) return;
    
    setStatusLoading(true);
    try {
      const status = await ExchangeRateApi.getSchedulerStatus(apiKey);
      setSchedulerStatus(status);
    } catch (error) {
      console.error('Failed to fetch scheduler status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  // 手动更新汇率
  const handleUpdateRates = async () => {
    setIsUpdating(true);
    try {
      console.log('🔄 Starting manual exchange rate update...');
      console.log('Current exchange rates before update:', exchangeRates);

      await updateExchangeRatesFromApi();

      console.log('✅ Exchange rate update completed');
      console.log('Exchange rates after update:', exchangeRates);

      await fetchSchedulerStatus(); // 更新状态
    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 组件加载时获取状态
  useEffect(() => {
    fetchSchedulerStatus();
  }, [apiKey]);

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusBadge = () => {
    if (!schedulerStatus) return null;
    
    if (!schedulerStatus.hasApiKey) {
      return <Badge variant="destructive">No API Key</Badge>;
    }
    
    if (schedulerStatus.isRunning) {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 状态卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Exchange Rate Status
          </CardTitle>
          <CardDescription>
            Automatic exchange rate updates and current status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Scheduler Status</p>
              <div className="flex items-center gap-2">
                {statusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getStatusBadge()
                )}
              </div>
            </div>
            
            <div className="space-y-1 text-right">
              <p className="text-sm font-medium">Last Update</p>
              <p className="text-sm text-muted-foreground">
                {formatLastUpdate(lastExchangeRateUpdate)}
              </p>
            </div>
          </div>
          
          {schedulerStatus?.nextRun && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Next Scheduled Update</p>
              <p className="text-sm text-muted-foreground">
                {new Date(schedulerStatus.nextRun).toLocaleString()}
              </p>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdateRates} 
              disabled={isUpdating || !apiKey}
              size="sm"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Update Now
            </Button>
            
            <Button 
              onClick={fetchSchedulerStatus} 
              variant="outline" 
              size="sm"
              disabled={statusLoading}
            >
              {statusLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>
          </div>
          
          {!apiKey && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                API key not configured. Automatic updates are disabled.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 汇率列表 */}
      <Card>
        <CardHeader>
          <CardTitle>Current Exchange Rates</CardTitle>
          <CardDescription>
            All rates are relative to USD (1 USD = X currency)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(exchangeRates).map(([currency, rate]) => (
              <div 
                key={currency} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1">
                  <p className="font-medium">{currency}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyAmount(rate, currency, false)}
                  </p>
                </div>
                {currency === 'USD' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
          
          {Object.keys(exchangeRates).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No exchange rates available</p>
              <Button 
                onClick={fetchExchangeRates} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Load Rates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
