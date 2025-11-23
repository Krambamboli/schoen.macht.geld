
'use client';

import type { Stock } from '@/lib/types';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

type StockWithChange = Stock & { change: number; percentChange: number; size: number };

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
          fill: isPositive ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(0 72.2% 50.6%)',
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
              {(percentChange ?? 0).toFixed(2)}%
          </div>
        </div>
      </foreignObject>
    </g>
  );
};


export default function MarketMapClient() {
  const [data, setData] = useState<StockWithChange[]>([]);

  useEffect(() => {
     const loadData = () => {
        const storedStocks: Stock[] = JSON.parse(localStorage.getItem('stocks') || '[]');

        if (storedStocks.length === 0) {
            setData([]);
            return;
        }

        const updatedData = storedStocks.map((stock: Stock) => {
            return { 
                ...stock, 
                change: stock.change || 0,
                percentChange: stock.percentChange || 0,
                // Treemap size should be based on market cap (value), must be positive
                size: Math.abs(stock.value) || 1, 
            };
        });
        setData(updatedData as StockWithChange[]);
    };
    
    loadData(); // Initial load
    const dataInterval = setInterval(loadData, 2000); // Refresh data every 2 seconds

    return () => clearInterval(dataInterval);
  }, []);
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="size"
        nameKey="nickname"
        aspectRatio={16 / 9}
        content={<CustomizedContent />}
        isAnimationActive={false}
      >
        <Tooltip
          contentStyle={{
            background: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'white' }}
          formatter={(value: number, name: string, props) => {
              if (!props.payload) return null;
              
              const payload = props.payload as StockWithChange;
              const currentValue = payload.value;
              const change = payload.change || 0;
              const percentChange = payload.percentChange || 0;
              const isPositive = change >= 0;

              return [
                  `$${currentValue.toFixed(2)}`,
                   <span key="change" className={isPositive ? 'text-green-400' : 'text-red-500'}>
                    {isPositive ? '+' : ''}{change.toFixed(2)} ({percentChange.toFixed(2)}%)
                   </span>
              ]
          }}
          labelFormatter={(label) => <span className="font-bold text-lg">{label}</span>}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
