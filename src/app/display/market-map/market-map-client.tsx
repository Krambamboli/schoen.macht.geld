
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
  const initialValuesRef = useRef(new Map<string, number>());

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
        
        // Initialize initial values if they don't exist yet for new stocks
        stocksToDisplay.forEach(stock => {
            if (!initialValuesRef.current.has(stock.id)) {
                initialValuesRef.current.set(stock.id, stock.value);
            }
        });

        const updatedData = stocksToDisplay.map((stock: Stock) => {
            const initialValue = initialValuesRef.current.get(stock.id) ?? stock.value;
            const change = stock.value - initialValue;
            const percentChange = initialValue === 0 ? 0 : (change / initialValue) * 100;
            
            return { 
                ...stock, 
                change,
                percentChange,
                // The Treemap `dataKey` should be positive to have an area
                value: Math.abs(stock.value) || 1, 
            };
        });
        setData(updatedData);
    };
    
    loadData(); // Initial load
    const dataInterval = setInterval(loadData, 2000); // Refresh data every 2 seconds

    return () => clearInterval(dataInterval);
  }, []);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="value" // Use `value` for block size
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
              // The original value is not on `value` anymore, let's get it from the payload
              const originalValue = payload.originalValue;
              const change = payload.change;
              const percentChange = payload.percentChange;
              const isPositive = change >= 0;
              return [
                  `$${(originalValue as number).toFixed(2)}`,
                  `${isPositive ? '+' : ''}${change.toFixed(2)} (${percentChange.toFixed(2)}%)`
              ]
          }}
          // We need to add originalValue to the payload so formatter can use it
          payloadCreator={(props) => {
             if (props.payload && props.payload[0] && props.payload[0].payload) {
                const stock = props.payload[0].payload;
                return [{
                    ...props.payload[0],
                    payload: {
                        ...stock,
                        originalValue: stock.history[stock.history.length-1]?.value ?? stock.value
                    }
                }];
            }
            return [];
          }}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
