'use client'

import { mockStocks } from "@/lib/mock-data";
import type { Stock } from "@/lib/types";
import { useEffect, useState } from "react";

const StockTicker = () => {
    const [stocks, setStocks] = useState<Stock[]>(mockStocks);

    useEffect(() => {
        const interval = setInterval(() => {
            setStocks(prevStocks => 
                prevStocks.map(stock => {
                    const change = (Math.random() - 0.45) * 0.5;
                    const newValue = Math.max(0, stock.value + change);
                    return { ...stock, value: newValue };
                })
            );
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const repeatedStocks = [...stocks, ...stocks];

    return (
        <div className="w-full bg-gray-900 text-white h-full flex items-center overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
                {repeatedStocks.map((stock, index) => (
                    <div key={`${stock.id}-${index}`} className="flex items-center mx-6">
                        <span className="text-2xl font-mono font-bold text-gray-400">{stock.ticker}</span>
                        <span className={`text-2xl font-mono font-bold ml-3 ${stock.value > 100 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stock.value.toFixed(2)}
                        </span>
                        <span className={`ml-2 text-lg ${stock.value > 100 ? 'text-green-400' : 'text-red-400'}`}>
                           {stock.value > 100 ? '▲' : '▼'}
                        </span>
                    </div>
                ))}
            </div>
            <style jsx>{`
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
            `}</style>
        </div>
    );
};


export default function DisplayTickerPage() {
  return (
    <div className="h-full w-full">
      <StockTicker />
    </div>
  );
}
