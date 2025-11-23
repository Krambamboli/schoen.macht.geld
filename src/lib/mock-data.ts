import type { Stock } from './types';
import { PlaceHolderImages } from './placeholder-images';

const generateTicker = (name: string): string => {
  const sanitized = name.toUpperCase().replace(/[^A-Z]/g, '');
  if (sanitized.length >= 4) {
    return sanitized.slice(0, 4);
  }
  return sanitized.padEnd(4, 'X');
};

const generateHistory = (initialValue: number): { date: string; value: number }[] => {
  const history: { date: string; value: number }[] = [];
  let currentValue = initialValue;
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentValue.toFixed(2)),
    });
    currentValue += (Math.random() - 0.5) * 2;
    if (currentValue < 1) currentValue = 1;
  }
  return history;
};

const initialNicknames = [
  'Captain-Chaos',
  'Diamond-Hands',
  'Krypto-König',
  'Aktien-Alex',
  'Börsen-Bella',
  'Chart-Champion',
];

export const mockStocks: Stock[] = initialNicknames.map((nickname, index) => {
  const initialValue = parseFloat((100 + (Math.random() - 0.5) * 20).toFixed(2));
  const image = PlaceHolderImages[index % PlaceHolderImages.length];

  return {
    id: `${index + 1}`,
    ticker: generateTicker(nickname),
    nickname: nickname,
    photoUrl: image.imageUrl,
    description:
      'KI generierte Beschreibung: Macht Geld wirklich schön? Dieses Profil stellt die These auf die Probe. Investieren Sie jetzt und finden Sie es heraus.',