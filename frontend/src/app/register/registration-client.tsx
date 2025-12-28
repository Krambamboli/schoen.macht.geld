// Copied from _archived/register/registration-client.tsx to make it active
'use client';

import { generateProfileDescription } from '../../ai/flows/generate-profile-descriptions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Camera,
  CameraOff,
  Edit,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { EditStockDialog } from './edit-stock-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function RegistrationClient() {
  // Registration State
  const [nickname, setNickname] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Admin State
  const [editingStock, setEditingStock] = useState<any | null>(null);
  const [stocks, setStocks] = useState<BackendStock[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  function dataUrlToBlob(dataUrl: string): Blob {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(header);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  type BackendStock = {
    ticker: string;
    title: string;
    description: string;
    price: number;
    percent_change?: number | null;
  };

  const fetchStocks = useCallback(async () => {
    try {
      setIsLoadingStocks(true);
      const baseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || '/api')
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
      const res = await fetch(`${baseUrl}/stocks/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BackendStock[] = await res.json();
      setStocks(data);
    } catch (e) {
      console.error('Fehler beim Laden der Titel:', e);
    } finally {
      setIsLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const stopStream = useCallback(() => {
    setStream(currentStream => {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        return null;
    });
  }, []);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const availableDevices = (
          await navigator.mediaDevices.enumerateDevices()
        ).filter((device) => device.kind === 'videoinput');

        // Stop the initial stream to release the camera lock
        initialStream.getTracks().forEach((track) => track.stop());

        setDevices(availableDevices);
        if (availableDevices.length > 0) {
          const preferredDeviceId = localStorage.getItem('preferredCameraId');
          const deviceToUse =
            availableDevices.find((d) => d.deviceId === preferredDeviceId) ||
            availableDevices[0];
          setSelectedDeviceId(deviceToUse.deviceId);
        } else {
            setError('Keine Kameras gefunden.');
        }
      } catch (err) {
        console.error("Error enumerating devices:", err)
        setError(
          'Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff in deinen Browser-Einstellungen.'
        );
      }
    };

    getDevices();
    return () => {
        stopStream();
    };
  }, [stopStream]);

  useEffect(() => {
    if (selectedDeviceId && !photoDataUrl) {
      localStorage.setItem('preferredCameraId', selectedDeviceId);
      let isCancelled = false;

      const getCameraStream = async () => {
        stopStream();
        try {
            setError(null);
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedDeviceId } },
            });
            if (!isCancelled) {
              setStream(newStream);
              if (videoRef.current) {
                  videoRef.current.srcObject = newStream;
              }
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
             if (!isCancelled) {
              setError(
                  'Kamera konnte nicht geöffnet werden. Bitte überprüfe die Berechtigungen und versuche es erneut.'
              );
            }
        }
      }

      getCameraStream();

      return () => {
          isCancelled = true;
          setStream(currentStream => {
            if (currentStream) {
              currentStream.getTracks().forEach(track => track.stop());
            }
            return null;
          });
      }
    } else if (photoDataUrl) {
        stopStream();
    }
  }, [selectedDeviceId, photoDataUrl, stopStream]);

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoDataUrl(dataUrl);
      stopStream();
    }
  };

  const handleRetakePhoto = () => {
    setPhotoDataUrl(null);
  };

  const handleGenerateDescription = async () => {
    if (!nickname || !photoDataUrl) {
      toast({
        variant: 'destructive',
        title: 'Fehlende Informationen',
        description: 'Bitte gib einen Spitznamen an und mach ein Foto.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateProfileDescription({
        nickname,
        photoDataUri: photoDataUrl,
      });
      setDescription(result.description);
    } catch (err) {
      console.error('AI generation failed:', err);
      toast({
        variant: 'destructive',
        title: 'KI-Generierung fehlgeschlagen',
        description: err instanceof Error ? err.message : 'Konnte keine Beschreibung generieren. Bitte versuche es erneut.',
      });
      setDescription(
        'Die KI macht gerade Kaffeepause. Bitte schreib deine eigene fabelhafte Beschreibung.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegister = async () => {
    if (!nickname || !photoDataUrl || !description) {
      toast({
        variant: 'destructive',
        title: 'Registrierung unvollständig',
        description: 'Bitte fülle alle Felder aus, bevor du dich registrierst.',
      });
      return;
    }

    setIsRegistering(true);

    try {
      const raw = nickname.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const ticker = (raw.substring(0, 4) || nickname.substring(0, 4).toUpperCase()).padEnd(4, 'X');

      const form = new FormData();
      form.append('ticker', ticker);
      form.append('title', nickname);
      form.append('description', description);
      const blob = dataUrlToBlob(photoDataUrl);
      const file = new File([blob], `${ticker}.jpg`, { type: blob.type });
      form.append('image', file);

      const baseUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || '/api')
        : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');

      const res = await fetch(`${baseUrl}/stocks/`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        let details = '';
        try { details = await res.text(); } catch {}
        throw new Error(`HTTP ${res.status} ${details}`);
      }

      toast({
        title: 'Registrierung erfolgreich!',
        description: `${nickname} wird jetzt an der Schön. Macht. Geld. Börse gehandelt.`,
      });

      setNickname('');
      setPhotoDataUrl(null);
      setDescription('');

      fetchStocks();
    } catch (e: any) {
      console.error('Registrierung fehlgeschlagen:', e);
      toast({
        variant: 'destructive',
        title: 'Registrierung fehlgeschlagen',
        description: 'Bitte versuche es erneut. ' + (e?.message || ''),
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDelete = async (ticker: string) => {
    toast({
      title: 'Löschen nicht verfügbar',
      description: 'Das Backend bietet derzeit keinen Endpunkt zum Löschen von Titeln.',
    });
  };

  const openCMS = (ticker?: string) => {
    const baseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || '/api')
      : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
    const url = `${baseUrl}/admin`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Erstelle dein Börsenprofil</CardTitle>
          <CardDescription>
            Dein Spitzname und Foto werden verwendet, um dein Aktienprofil zu erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <Label htmlFor="nickname" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" /> Spitzname
              </Label>
              <Input
                id="nickname"
                placeholder="z.B., Koks-Kevin"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={!!photoDataUrl}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camera" className="flex items-center gap-2">
                <Camera className="w-4 h-4" /> Kamera
              </Label>
              <div className="aspect-video w-full rounded-md overflow-hidden bg-muted border relative flex items-center justify-center">
                {photoDataUrl ? (
                  <Image
                    unoptimized
                    src={photoDataUrl}
                    alt="Dein Foto"
                    layout="fill"
                    objectFit="cover"
                  />
                ) : error ? (
                  <div className="text-center text-destructive p-4 flex flex-col items-center gap-2">
                    <CameraOff className="w-8 h-8" />
                    <p>{error}</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={selectedDeviceId}
                onValueChange={setSelectedDeviceId}
                disabled={devices.length === 0 || !!photoDataUrl}
              >
                <SelectTrigger id="camera">
                  <SelectValue placeholder="Kamera auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Kamera ${devices.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {photoDataUrl ? (
                <Button
                  variant="outline"
                  onClick={handleRetakePhoto}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Foto wiederholen
                </Button>
              ) : (
                <Button onClick={handleTakePhoto} className="w-full" disabled={!stream}>
                  <Camera className="mr-2 h-4 w-4" /> Foto aufnehmen
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <Label
              htmlFor="description"
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-primary" /> KI-generierte Beschreibung
            </Label>
            <Textarea
              id="description"
              placeholder="Generiere eine Beschreibung oder schreibe deine eigene..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              className="flex-grow resize-none"
            />
            <Button
              onClick={handleGenerateDescription}
              disabled={!nickname || !photoDataUrl || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Mit KI generieren
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            size="lg"
            className="w-full"
            onClick={handleRegister}
            disabled={!nickname || !photoDataUrl || !description || isRegistering}
          >
            {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deine Aktie registrieren
          </Button>
        </CardFooter>
      </Card>

      <div className="mt-12">
        <Separator />
        <div className="mt-8">
          <h2 className="text-2xl font-bold font-headline mb-4">Marktverwaltung</h2>
          <div className="border rounded-lg">
            <div className="grid grid-cols-[1fr_80px_60px] md:grid-cols-[1fr_120px_100px_80px] items-center gap-3 p-2 font-bold bg-muted/50 border-b">
                <span className="pl-2">Spitzname</span>
                <span className='text-right hidden md:inline'>Wert</span>
                <span className='text-right hidden md:inline'>Veränderung</span>
                <span className='text-right'>Aktionen</span>
            </div>
            <div className='max-h-96 overflow-y-auto'>
              {isLoadingStocks && (
                <div className="p-4 text-sm text-muted-foreground">Lade Daten…</div>
              )}
              {stocks.map(stock => (
                 <div key={stock.ticker} className="grid grid-cols-[1fr_80px] md:grid-cols-[1fr_120px_100px_80px] items-center gap-3 p-2 border-b last:border-b-0">
                    <span className="font-semibold truncate pl-2">{stock.title}</span>
                    <span className='text-right hidden md:inline font-mono'>{stock.price.toFixed(2)}</span>
                    <span className={`text-right hidden md:inline font-mono ${(stock.percent_change ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stock.percent_change ?? 0).toFixed(2)}%
                    </span>
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingStock(stock)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openCMS(stock.ticker)} title="Im CMS löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editingStock && (
        <EditStockDialog
          stock={editingStock}
          isOpen={!!editingStock}
          onClose={() => setEditingStock(null)}
        />
      )}
    </>
  );
}
