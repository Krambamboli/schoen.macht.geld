import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Presentation, Smartphone, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/icons';

export default function Home() {
  const features = [
    {
      title: 'Registration Station',
      description:
        'On-site registration with nickname and live photo capture. Become a new stock on the market.',
      href: '/register',
      icon: <UserPlus className="h-10 w-10" />,
    },
    {
      title: 'Stock Swipe',
      description:
        'Kiosk-mode app for swiping stocks (profiles) left or right, influencing stock value in real-time.',
      href: '/swipe',
      icon: <Smartphone className="h-10 w-10" />,
    },
    {
      title: 'Market Display',
      description:
        'Live market data visualization. Includes stock tickers, market maps, and a Bloomberg-style terminal.',
      href: '/display',
      icon: <Presentation className="h-10 w-10" />,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 sm:p-8">
      <div className="flex flex-col items-center justify-center space-y-8 text-center">
        <div className="flex items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-headline font-bold tracking-tighter">
            MachtSchön <span className="text-primary">Börse</span>
          </h1>
        </div>
        <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl font-body">
          Geld. Macht. Schön. The ultimate stock market simulation party game.
          Register, get swiped, and watch your value soar (or plummet).
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
        {features.map((feature) => (
          <Link href={feature.href} key={feature.title} className="group">
            <Card className="h-full transform transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary">
              <CardHeader className="flex flex-col items-center justify-center text-center">
                <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  {feature.icon}
                </div>
                <CardTitle className="text-2xl font-headline">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
