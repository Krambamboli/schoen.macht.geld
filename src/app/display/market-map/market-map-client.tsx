'use client';

import type { Stock } from '@/lib/types';
import { useMemo } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, percentChange, ticker } = props;

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
  const { firestore } = useFirebase();
  const titlesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'titles') : null, [firestore]);
  const { data: stocks } = useCollection<Stock>(titlesCollection);
  
  const treemapData = useMemo(() => {
    if (!stocks) return [];
    return stocks.map(stock => ({
      ...stock,
      name: stock.nickname,
      // Treemap size should be based on market cap (value), must be positive
      size: Math.abs(stock.currentValue) || 1,
    }));
  }, [stocks]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={treemapData}
        dataKey="size"
        nameKey="name"
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
              
              const payload = props.payload as Stock;
              const isPositive = payload.change >= 0;

              return [
                   `${payload.currentValue.toFixed(2)} CHF`,
                   <span key="change" className={isPositive ? 'text-green-400' : 'text-red-500'}>
                    {isPositive ? '+' : ''}{payload.change.toFixed(2)} ({payload.percentChange.toFixed(2)}%)
                   </span>
              ]
          }}
          labelFormatter={(label) => <span className="font-bold text-lg">{label}</span>}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}
