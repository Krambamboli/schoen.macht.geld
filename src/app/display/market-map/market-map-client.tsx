'use client';

import { mockStocks } from '@/lib/mock-data';
import type { Stock } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';
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
  const previousValuesRef = useRef(new Map<string, number>());

  useEffect(() => {
     const loadData = () => {
        const hasRegistered = localStorage.getItem('firstRegistration') === 'true';
        let stocksToDisplay: Stock[];

        if (hasRegistered) {
            const storedStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
            stocksToDisplay = storedStocks.length > 0 ? storedStocks : mockStocks;
        } else {
            stocksToDisplay = mockStocks;
        }
        
        const previousValues = previousValuesRef.current;

        const updatedData = stocksToDisplay.map((stock: Stock) => {
            let prevValue = previousValues.get(stock.id);
            
            if (prevValue === undefined) {
              prevValue = stock.value;
              previousValues.set(stock.id, stock.value);
            }

            const change = stock.value - prevValue;
            const percentChange = prevValue === 0 ? 0 : (change / prevValue) * 100;
            
            // This was the bug: we need to update the ref with the *new* value
            // if we want to calculate change against the last known value in the next interval.
            // However, for the *current* render, we need the change from the previous state.
            // The best approach is to only set the initial value and let the `value` prop drive size.
            // The change calculation needs to be against the value from the *last poll*.

            return { 
                ...stock, 
                change,
                percentChange,
            };
        });
        setData(updatedData);

        // After processing, update the ref for the *next* interval
        stocksToDisplay.forEach(stock => {
            previousValues.set(stock.id, stock.value);
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
          formatter={(value: number, name: string, props) => {
              const { payload } = props;
              const change = payload.change;
              const percentChange = payload.percentChange;
              const isPositive = change >= 0;
              return [
                  `$${(value as number).toFixed(2)}`,
                  `${isPositive ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)`
              ]
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
