'use client'

import { mockStocks } from "@/lib/mock-data";
import type { Stock } from "@/lib/types";
import { useEffect, useState } from "react";

const StockTicker = () => {
    const [stocks, setStocks] = useState<Stock[]>([]);

    useEffect(() => {
        const loadData = () => {
            const hasRegistered = localStorage.getItem('firstRegistration') === 'true';
            let stocksToDisplay;
            if (hasRegistered) {
                const storedStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
                stocksToDisplay = storedStocks.length > 0 ? storedStocks : mockStocks;
            } else {
                stocksToDisplay = mockStocks;
            }
            setStocks(stocksToDisplay);
        };

        loadData();
        const interval = setInterval(loadData, 2000); // Poll for updates every 2 seconds

        return () => clearInterval(interval);
    }, []);

    if (stocks.length === 0) {
        return (
            <div className="w-full bg-gray-900 text-white h-full flex items-center justify-center">
                <span className="text-2xl font-mono font-bold text-gray-400">Waiting for market data...</span>
            </div>
        );
    }
    
    // Repeat the stocks to create a seamless loop, ensuring there are enough items for a smooth animation
    const repeatedStocks = stocks.length > 0 ? Array(10).fill(stocks).flat() : [];


    return (
        <div className="w-full bg-gray-900 text-white h-full flex items-center overflow-hidden">
            <div className="flex animate-marquee whitespace-nowrap">
                {repeatedStocks.map((stock, index) => (
                    <div key={`${stock.id}-${index}`} className="flex items-center mx-6">
                        <span className="text-2xl font-mono font-bold text-gray-400">{stock.nickname}</span>
                        <span className={`text-2xl font-mono font-bold ml-3 ${stock.sentiment >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stock.value.toFixed(2)}
                        </span>
                        <span className={`ml-2 text-lg ${stock.sentiment >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {stock.sentiment >= 0 ? '▲' : '▼'}
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
                    animation: marquee ${stocks.length * 5}s linear infinite;
                    min-width: 100%;
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
