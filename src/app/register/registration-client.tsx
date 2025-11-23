'use client';

import { generateProfileDescription } from '@/ai/flows/generate-profile-descriptions';
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
  Loader2,
  RefreshCw,
  Sparkles,
  User,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFirebase } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Stock } from '@/lib/types';

export default function RegistrationClient() {
  const [nickname, setNickname] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const { firestore, auth, user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

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
        await navigator.mediaDevices.getUserMedia({ video: true });
        const availableDevices = (
          await navigator.mediaDevices.enumerateDevices()
        ).filter((device) => device.kind === 'videoinput');
        
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
        description: 'Konnte keine Beschreibung generieren. Bitte versuche es erneut.',
      });
      setDescription(
        'Die KI macht gerade Kaffeepause. Bitte schreib deine eigene fabelhafte Beschreibung.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegister = () => {
    if (!firestore || !user) {
       toast({ variant: 'destructive', title: 'Datenbank nicht bereit', description: 'Bitte warte einen Moment und versuche es erneut.' });
       return;
    }

    if (!nickname || !photoDataUrl || !description) {
       toast({
        variant: 'destructive',
        title: 'Registrierung unvollständig',
        description: 'Bitte fülle alle Felder aus, bevor du dich registrierst.',
      });
      return;
    }
    
    setIsRegistering(true);
    
    const initialValue = 100.0;
    const docId = Date.now().toString();

    const newStock: Stock = {
      id: docId,
      ticker: nickname.substring(0, 4).toUpperCase().padEnd(4, 'X'),
      nickname,
      photoUrl: photoDataUrl,
      description,
      currentValue: initialValue,
      initialValue: initialValue,
      change: 0,
      percentChange: 0,
      valueChangeLastMinute: 0,
      history: [{ value: initialValue, timestamp: new Date().toISOString() }],
    };
    
    const docRef = doc(firestore, 'titles', docId);

    setDocumentNonBlocking(docRef, newStock, {});

    setTimeout(() => {
      toast({
        title: 'Registrierung erfolgreich!',
        description: `${nickname} wird jetzt an der Schön. Macht. Geld. Börse gehandelt.`,
      });
      // Reset form for the next person
      setNickname('');
      setPhotoDataUrl(null);
      setDescription('');
      setIsRegistering(false);
    }, 1500);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Erstelle dein Börsenprofil</CardTitle>
        <CardDescription>
          Dein Spitzname und Foto werden verwendet, um dein Aktienprofil zu erstellen.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Camera and Nickname */}
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

        {/* Right Column: Description */}
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
          disabled={!nickname || !photoDataUrl || !description || isRegistering || isUserLoading || !user}
        >
          {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Deine Aktie registrieren
        </Button>
      </CardFooter>
    </Card>
  );
}
