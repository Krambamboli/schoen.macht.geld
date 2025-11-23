'use client';

import { mockStocks } from '@/lib/mock-data';
import type { Stock } from '@/lib/types';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

const CustomizedContent = ({
  root,
  depth,
  x,
  y,
  width,
  height,
  index,
  payload,
  colors,
  name,
  value,
  change,
}: any) => {
  const isPositive = change >= 0;
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
            justifyContent: 'space-between',
            color: 'white',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{payload.ticker}</div>
          </div>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              ${value.toFixed(2)}
            </div>
            <div style={{ color: isPositive ? '#A7F3D0' : '#FECACA' }}>
              {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};

export default function MarketMapClient() {
  const [data, setData] = useState(
    mockStocks.map((s) => ({ ...s, change: 0 }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) =>
        prevData.map((stock) => {
          const randomChange = (Math.random() - 0.5) * 5; // Change between -2.5% and +2.5%
          const newValue = Math.max(10, stock.value * (1 + randomChange / 100));
          return {
            ...stock,
            value: newValue,
            change: randomChange,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <Treemap
        data={data}
        dataKey="value"
        nameKey="nickname"
        aspectRatio={16 / 9}
        content={<CustomizedContent />}
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
