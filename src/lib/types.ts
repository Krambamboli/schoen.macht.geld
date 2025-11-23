export interface Stock {
  id: string;
  ticker: string;
  nickname: string;
  photoUrl: string;
  description: string;
  value: number;
  history: { date: string; value: number }[];
  sentiment: number; // sum of +1