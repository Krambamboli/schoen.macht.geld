'use client';

import { mockStocks } from '@/lib/mock-data';
import type { Stock } from '@/lib/types';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

type StockWithChange = Stock & { change: number; percentChange: number };

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, value, percentChange, ticker } = props;

  // Don't render tiny boxes
  if (width < 50 || height < 40) {
    return null;
  }

  const isPositive = percentChange >= 0;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: isPositive ? '#10B981' : '#EF4444',
          stroke: '#1f2937',
          strokeWidth: 2,
          opacity: 0.8,
        }}
      />
      <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            color: 'white',
            textAlign: 'left',
            padding: '4px',
          }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{ticker}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ marginTop: 'auto', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isPositive ? '+' : ''}
              {percentChange?.toFixed(2) ?? '0.00'}%
          </div>
        </div>
      </foreignObject>
    </g>
  );
};


export default function MarketMapClient() {
  const [data, setData] = useState<StockWithChange[]>([]);

  useEffect(() => {
     const previousValues = new Map<string, number>();

     const loadData = () => {
        const hasRegistered = localStorage.getItem('firstRegistration') === 'true';
        let stocksToDisplay: Stock[];

        if (hasRegistered) {
            const storedStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
            stocksToDisplay = storedStocks.length > 0 ? storedStocks : mockStocks;
        } else {
            stocksToDisplay = mockStocks;
        }

        setData(prevData => {
            return stocksToDisplay.map((stock: Stock) => {
                let prevValue = previousValues.get(stock.id);
                if (prevValue === undefined) {
                  // If we don't have a previous value, use the current value to avoid a huge initial change
                  prevValue = stock.value;
                  previousValues.set(stock.id, stock.value);
                }

                const change = stock.value - prevValue;
                const percentChange = prevValue === 0 ? 0 : (change / prevValue) * 100;
                
                // Only update previous value if there was a change, but also set it initially
                if (stock.value !== prevValue) {
                    previousValues.set(stock.id, prevValue); // keep the old value for change calculation
                }

                return { 
                    ...stock, 
                    change: change,
                    percentChange: percentChange,
                };
            });
        });
    };
    
    loadData(); // Initial load
    const dataInterval = setInterval(loadData, 2000); // Refresh data every 2 seconds

    return () => clearInterval(dataInterval);
  }, []);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="value"
        nameKey="nickname"
        aspectRatio={16 / 9}
        content={<CustomizedContent />}
        isAnimationActive={false} // Better for frequent updates
      >
        <Tooltip
          contentStyle={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'white' }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
