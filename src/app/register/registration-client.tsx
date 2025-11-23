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

  const stopStream = useCallback(() => {
    // Access the stream from the state inside the callback to ensure it's the latest version.
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
            setError('No camera devices found.');
        }
      } catch (err) {
        console.error("Error enumerating devices:", err)
        setError(
          'Camera permission denied. Please allow camera access in your browser settings.'
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
                  'Could not access camera. Please check permissions and try again.'
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
        title: 'Missing Information',
        description: 'Please provide a nickname and take a photo.',
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
        title: 'AI Generation Failed',
        description: 'Could not generate a description. Please try again.',
      });
      setDescription(
        'The AI is on a coffee break. Please write your own fabulous description.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegister = () => {
    if (!nickname || !photoDataUrl || !description) {
       toast({
        variant: 'destructive',
        title: 'Registration Incomplete',
        description: 'Please fill out all fields before registering.',
      });
      return;
    }
    
    setIsRegistering(true);
    
    const initialValue = 100;
    const newStock = {
      id: Date.now().toString(),
      ticker: nickname.substring(0, 4).toUpperCase().padEnd(4, 'X'),
      nickname,
      photoUrl: photoDataUrl,
      description,
      value: initialValue,
      history: [],
      sentiment: 0,
      change: 0,
      percentChange: 0,
    };
    
    // This is the first ever registration, clear all mock data and session history
    const isFirstRegistration = localStorage.getItem('firstRegistration') !== 'true';
    if (isFirstRegistration) {
      // Clear all stock-related data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('stock_') || key.startsWith('initial_stock_') || key === 'stocks' || key === 'firstRegistration') {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('firstRegistration', 'true');
      localStorage.setItem('stocks', JSON.stringify([newStock]));
      localStorage.setItem(`initial_stock_${newStock.id}`, JSON.stringify(initialValue));

    } else {
      const existingStocks = JSON.parse(localStorage.getItem('stocks') || '[]');
      const newStockList = [...existingStocks, newStock];
      localStorage.setItem('stocks', JSON.stringify(newStockList));
      localStorage.setItem(`initial_stock_${newStock.id}`, JSON.stringify(initialValue));
    }


    setTimeout(() => {
      toast({
        title: 'Registration Successful!',
        description: `${nickname} is now trading on the MachtSchön Börse.`,
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
        <CardTitle>Create Your Stock Profile</CardTitle>
        <CardDescription>
          Your nickname and photo will be used to generate your stock profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Camera and Nickname */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="nickname" className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4" /> Nickname
            </Label>
            <Input
              id="nickname"
              placeholder="e.g., DiamondHands"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={!!photoDataUrl}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera" className="flex items-center gap-2">
              <Camera className="w-4 h-4" /> Camera
            </Label>
            <div className="aspect-video w-full rounded-md overflow-hidden bg-muted border relative flex items-center justify-center">
              {photoDataUrl ? (
                <Image
                  src={photoDataUrl}
                  alt="Your photo"
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
                <SelectValue placeholder="Select camera..." />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
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
                <RefreshCw className="mr-2 h-4 w-4" /> Retake Photo
              </Button>
            ) : (
              <Button onClick={handleTakePhoto} className="w-full" disabled={!stream}>
                <Camera className="mr-2 h-4 w-4" /> Take Photo
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
            <Sparkles className="w-4 h-4 text-primary" /> AI Generated
            Description
          </Label>
          <Textarea
            id="description"
            placeholder="Generate a description or write your own..."
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
            Generate with AI
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
          Register Your Stock
        </Button>
      </CardFooter>
    </Card>
  );
}
