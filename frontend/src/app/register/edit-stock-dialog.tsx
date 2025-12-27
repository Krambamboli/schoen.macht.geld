// Copied from _archived/register/edit-stock-dialog.tsx to make it active
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

// Backend stock shape used in registration-client
export type BackendStock = {
  ticker: string;
  title: string;
  description: string;
  price: number;
  percent_change?: number | null;
};

interface EditStockDialogProps {
  stock: BackendStock;
  isOpen: boolean;
  onClose: () => void;
}

export function EditStockDialog({ stock, isOpen, onClose }: EditStockDialogProps) {
  const [title, setTitle] = useState(stock.title);
  const [description, setDescription] = useState(stock.description);
  const [price, setPrice] = useState(stock.price.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (stock) {
      setTitle(stock.title);
      setDescription(stock.description);
      setPrice(stock.price.toString());
      setError(null);
      setSuccess(null);
    }
  }, [stock]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const baseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || '/api')
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

      // Try PATCH with available fields; backend may accept title/description/price
      const body: any = { title, description };
      const newPrice = parseFloat(price);
      if (!isNaN(newPrice)) body.price = newPrice;

      const res = await fetch(`${baseUrl}/stocks/${encodeURIComponent(stock.ticker)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Fallback: attempt PUT if PATCH not supported
        const resPut = await fetch(`${baseUrl}/stocks/${encodeURIComponent(stock.ticker)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!resPut.ok) {
          let details = '';
          try { details = await resPut.text(); } catch {}
          throw new Error(`HTTP ${resPut.status} ${details}`);
        }
      }

      setSuccess('Titel aktualisiert.');
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (e: any) {
      setIsSaving(false);
      setError(e?.message || 'Aktualisierung fehlgeschlagen.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titel bearbeiten: {stock.title}</DialogTitle>
          <DialogDescription>
            Ändere die Details dieses Titels. Änderungen werden sofort wirksam.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!!error && <div className="text-destructive text-sm">{error}</div>}
          {!!success && <div className="text-green-600 text-sm">{success}</div>}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Spitzname</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Wert</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Beschreibung</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={5} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
