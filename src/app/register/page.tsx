import RegistrationClient from './registration-client';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex flex-col items-center space-y-4 text-center mb-8">
          <Logo className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold font-headline">Join the Market</h1>
          <p className="text-muted-foreground text-lg">
            Create your profile to become a publicly traded entity at the
            MachtSchön Bör