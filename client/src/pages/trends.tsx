import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChart } from "@/components/charts/trend-chart";
import { cn } from "@/lib/utils";

const trendTabs = [
  { key: 'short', label: 'Сутки к неделе' },
  { key: 'medium', label: 'Неделя к месяцу' },
  { key: 'long', label: 'Месяц к году' },
  { key: 'yearly', label: 'Сутки к году' },
];

const mockTopChanges = {
  short: {
    increase: [
      { name: 'ЦТП-125', value: '+8.5 т/ч' },
      { name: 'ЦТП-156', value: '+7.2 т/ч' },
      { name: 'ЦТП-234', value: '+6.1 т/ч' },
    ],
    decrease: [
      { name: 'ЦТП-089', value: '-5.3 т/ч' },
      { name: 'ЦТП-421', value: '-4.8 т/ч' },
      { name: 'ЦТП-317', value: '-3.9 т/ч' },
    ],
    rtsStats: [
      { name: 'РТС-1', value: '-12.5 т/ч' },
      { name: 'РТС-4', value: '-15.8 т/ч' },
      { name: 'РТС-2', value: '-8.3 т/ч' },
    ],
  },
  medium: {
    increase: [
      { name: 'ЦТП-198', value: '+12.3 т/ч' },
      { name: 'ЦТП-045', value: '+9.8 т/ч' },
      { name: 'ЦТП-267', value: '+8.4 т/ч' },
    ],
    decrease: [
      { name: 'ЦТП-125', value: '-8.9 т/ч' },
      { name: 'ЦТП-304', value: '-7.1 т/ч' },
      { name: 'ЦТП-156', value: '-6.5 т/ч' },
    ],
    rtsStats: [
      { name: 'РТС-1', value: '-28.4 т/ч' },
      { name: 'РТС-2', value: '-19.7 т/ч' },
      { name: 'РТС-3', value: '-15.2 т/ч' },
    ],
  },
  long: {
    increase: [
      { name: 'ЦТП-089', value: '+24.8 т/ч' },
      { name: 'ЦТП-421', value: '+18.9 т/ч' },
      { name: 'ЦТП-267', value: '+15.3 т/ч' },
    ],
    decrease: [
      { name: 'ЦТП-125', value: '-18.4 т/ч' },
      { name: 'ЦТП-156', value: '-15.7 т/ч' },
      { name: 'ЦТП-304', value: '-12.9 т/ч' },
    ],
    rtsStats: [
      { name: 'РТС-1', value: '-45.8 т/ч' },
      { name: 'РТС-4', value: '-38.2 т/ч' },
      { name: 'РТС-2', value: '-32.1 т/ч' },
    ],
  },
  yearly: {
    increase: [
      { name: 'ЦТП-234', value: '+32.1 т/ч' },
      { name: 'ЦТП-198', value: '+28.7 т/ч' },
      { name: 'ЦТП-345', value: '+22.4 т/ч' },
    ],
    decrease: [
      { name: 'ЦТП-125', value: '-28.9 т/ч' },
      { name: 'ЦТП-089', value: '-24.3 т/ч' },
      { name: 'ЦТП-421', value: '-19.8 т/ч' },
    ],
    rtsStats: [
      { name: 'РТС-1', value: '-71.0 т/ч' },
      { name: 'РТС-4', value: '-58.7 т/ч' },
      { name: 'РТС-2', value: '-45.3 т/ч' },
    ],
  },
};

export default function Trends() {
  const [activeTab, setActiveTab] = useState<string>('short');

  const currentData = mockTopChanges[activeTab as keyof typeof mockTopChanges];

  return (
    <div className="space-y-6">
      {/* Tab Container */}
      <div className="tab-container">
        {trendTabs.map((tab) => (
          <div
            key={tab.key}
            className={cn("tab", activeTab === tab.key && "active")}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            Тренды ЦТП «{trendTabs.find(t => t.key === activeTab)?.label}» в т/ч
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[450px]" data-testid="trends-chart">
            <TrendChart 
              period={activeTab === 'short' ? 'week' : 
                     activeTab === 'medium' ? 'month' : 'year'} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Increase */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Топ рост подпитки</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {currentData.increase.map((item, index) => (
              <div 
                key={index}
                className="flex justify-between py-2 border-b border-border last:border-0"
                data-testid={`increase-${index}`}
              >
                <span>{item.name}</span>
                <span className="font-semibold text-red-600">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Decrease */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Топ снижение подпитки</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {currentData.decrease.map((item, index) => (
              <div 
                key={index}
                className="flex justify-between py-2 border-b border-border last:border-0"
                data-testid={`decrease-${index}`}
              >
                <span>{item.name}</span>
                <span className="font-semibold text-green-600">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* RTS Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Статистика по РТС</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {currentData.rtsStats.map((item, index) => (
              <div 
                key={index}
                className="flex justify-between py-2 border-b border-border last:border-0"
                data-testid={`rts-stat-${index}`}
              >
                <span>{item.name}</span>
                <span className="font-semibold text-green-600">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
