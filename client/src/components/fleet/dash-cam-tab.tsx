import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Camera, CameraOff, Play, Square, Download, Trash2, MapPin, Clock, Gauge, AlertTriangle, Video, HardDrive, Wifi, WifiOff, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DashCamRecording {
  id: string;
  filename: string;
  startTime: string;
  endTime: string;
  duration: number;
  fileSize: number;
  startLocation: { lat: number; lng: number } | null;
  endLocation: { lat: number; lng: number } | null;
  maxSpeed: number;
  averageSpeed: number;
  incidents: number;
  videoUrl: string;
  thumbnailUrl?: string;
}

interface GpsData {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: number;
  accuracy: number;
}

export function DashCamTab() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('prompt');
  const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentGps, setCurrentGps] = useState<GpsData | null>(null);
  const [gpsHistory, setGpsHistory] = useState<GpsData[]>([]);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState<DashCamRecording | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { data: recordings = [], isLoading } = useQuery<DashCamRecording[]>({
    queryKey: ['/api/fleet/dashcam/recordings'],
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/fleet/dashcam/recordings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/dashcam/recordings'] });
      toast({ title: 'Recording deleted', description: 'The recording has been removed.' });
      setDeleteDialogOpen(false);
      setRecordingToDelete(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete recording.', variant: 'destructive' });
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (recordings.length > 0) {
      const total = recordings.reduce((acc, rec) => acc + rec.fileSize, 0);
      setStorageUsed(total);
    }
  }, [recordings]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && recordingStartTime) {
      interval = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);

  const initializeCamera = useCallback(async () => {
    if (!videoRef.current) return;
    
    setCameraPermission('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraPermission('granted');
      setIsPreviewing(true);
      
      toast({ title: 'Camera ready', description: 'Dash cam preview is now active.' });
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraPermission('denied');
      toast({ 
        title: 'Camera access denied', 
        description: 'Please enable camera permissions to use dash cam.', 
        variant: 'destructive' 
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsPreviewing(false);
    setCameraPermission('prompt');
  }, []);

  const startGpsTracking = useCallback(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const speedMph = (position.coords.speed || 0) * 2.237;
          const gpsData: GpsData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            speed: Math.round(speedMph),
            heading: position.coords.heading || 0,
            timestamp: Date.now(),
            accuracy: position.coords.accuracy,
          };
          setCurrentGps(gpsData);
          setGpsHistory(prev => [...prev, gpsData]);
          if (gpsData.speed > maxSpeed) {
            setMaxSpeed(gpsData.speed);
          }
        },
        (error) => console.error('GPS error:', error),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
      return watchId;
    }
    return null;
  }, [maxSpeed]);

  const drawOverlay = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !isPreviewing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth || 1920;
    canvas.height = videoRef.current.videoHeight || 1080;
    
    ctx.drawImage(videoRef.current, 0, 0);
    
    const now = new Date();
    const timestamp = format(now, 'dd/MM/yyyy HH:mm:ss');
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, 10, 320, 100);
    ctx.fillRect(canvas.width - 200, 10, 190, 60);
    ctx.fillRect(10, canvas.height - 50, 250, 40);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px monospace';
    
    ctx.fillText(`📅 ${timestamp}`, 20, 35);
    
    if (currentGps) {
      ctx.fillText(`📍 ${currentGps.lat.toFixed(5)}, ${currentGps.lng.toFixed(5)}`, 20, 60);
      ctx.fillText(`🧭 Heading: ${Math.round(currentGps.heading)}°`, 20, 85);
      ctx.fillText(`📶 Accuracy: ${Math.round(currentGps.accuracy)}m`, 20, 105);
      
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = currentGps.speed > 70 ? '#FF4444' : '#00FF00';
      ctx.fillText(`${currentGps.speed} MPH`, canvas.width - 190, 50);
    } else {
      ctx.fillText(`📍 GPS: Acquiring...`, 20, 60);
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#FFAA00';
      ctx.fillText(`-- MPH`, canvas.width - 190, 50);
    }
    
    if (isRecording) {
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(30, canvas.height - 30, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px monospace';
      const mins = Math.floor(recordingDuration / 60);
      const secs = recordingDuration % 60;
      ctx.fillText(`⏺ REC ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`, 50, canvas.height - 25);
    }
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.fillText('TruckNav Pro DashCam', 10, canvas.height - 5);
    
    animationFrameRef.current = requestAnimationFrame(drawOverlay);
  }, [isPreviewing, currentGps, isRecording, recordingDuration]);

  useEffect(() => {
    if (isPreviewing) {
      animationFrameRef.current = requestAnimationFrame(drawOverlay);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPreviewing, drawOverlay]);

  const startRecording = useCallback(async () => {
    if (!canvasRef.current) return;
    
    const gpsWatchId = startGpsTracking();
    
    const stream = canvasRef.current.captureStream(30);
    
    if (videoRef.current?.srcObject) {
      const audioTracks = (videoRef.current.srcObject as MediaStream).getAudioTracks();
      audioTracks.forEach(track => stream.addTrack(track));
    }
    
    const options = { mimeType: 'video/webm;codecs=vp9' };
    try {
      mediaRecorderRef.current = new MediaRecorder(stream, options);
    } catch {
      mediaRecorderRef.current = new MediaRecorder(stream);
    }
    
    recordedChunksRef.current = [];
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      await saveRecording(blob);
      
      if (gpsWatchId) {
        navigator.geolocation.clearWatch(gpsWatchId);
      }
    };
    
    mediaRecorderRef.current.start(1000);
    setIsRecording(true);
    setRecordingStartTime(new Date());
    setRecordingDuration(0);
    setMaxSpeed(0);
    setGpsHistory([]);
    
    toast({ title: 'Recording started', description: 'Dash cam is now recording.' });
  }, [startGpsTracking, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: 'Recording stopped', description: 'Saving video...' });
    }
  }, [isRecording, toast]);

  const saveRecording = async (blob: Blob) => {
    try {
      const filename = `dashcam_${format(new Date(), 'yyyyMMdd_HHmmss')}.webm`;
      
      const formData = new FormData();
      formData.append('video', blob, filename);
      formData.append('metadata', JSON.stringify({
        startTime: recordingStartTime?.toISOString(),
        endTime: new Date().toISOString(),
        duration: recordingDuration,
        startLocation: gpsHistory[0] || null,
        endLocation: gpsHistory[gpsHistory.length - 1] || null,
        maxSpeed: maxSpeed,
        averageSpeed: gpsHistory.length > 0 
          ? Math.round(gpsHistory.reduce((acc, g) => acc + g.speed, 0) / gpsHistory.length)
          : 0,
        gpsTrack: gpsHistory,
      }));
      
      const response = await fetch('/api/fleet/dashcam/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      
      queryClient.invalidateQueries({ queryKey: ['/api/fleet/dashcam/recordings'] });
      toast({ title: 'Recording saved', description: 'Video has been uploaded to storage.' });
    } catch (error) {
      console.error('Failed to save recording:', error);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashcam_${format(new Date(), 'yyyyMMdd_HHmmss')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ 
        title: 'Saved locally', 
        description: 'Cloud upload failed. Video downloaded to your device.',
        variant: 'default'
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Dash Cam Telemetry
          </h2>
          <p className="text-muted-foreground">
            Record journey footage with GPS overlay and speed data
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center gap-1">
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatFileSize(storageUsed)} used
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Live Camera View
            </CardTitle>
            <CardDescription>
              Preview and record with GPS overlay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                style={{ display: isPreviewing ? 'block' : 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: isPreviewing ? 'block' : 'none' }}
              />
              
              {!isPreviewing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <CameraOff className="w-16 h-16 mb-4 text-gray-400" />
                  <p className="text-lg mb-4">Camera not active</p>
                  <Button onClick={initializeCamera} disabled={cameraPermission === 'loading'}>
                    {cameraPermission === 'loading' ? 'Starting...' : 'Start Camera'}
                  </Button>
                </div>
              )}
              
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                  <Circle className="w-3 h-3 fill-current" />
                  <span className="font-mono text-sm">REC {formatDuration(recordingDuration)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              {!isPreviewing ? (
                <Button onClick={initializeCamera} disabled={cameraPermission === 'loading'} className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  {cameraPermission === 'loading' ? 'Starting Camera...' : 'Start Camera'}
                </Button>
              ) : (
                <>
                  {!isRecording ? (
                    <Button onClick={startRecording} className="flex-1 bg-red-600 hover:bg-red-700">
                      <Circle className="w-4 h-4 mr-2 fill-current" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="flex-1">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}
                  <Button onClick={stopCamera} variant="outline" disabled={isRecording}>
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Live Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div className="text-4xl font-bold font-mono">
                {currentGps?.speed ?? '--'}
              </div>
              <div className="text-sm text-muted-foreground">MPH</div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3 h-3" />
                  Latitude
                </div>
                <div className="font-mono text-sm">{currentGps?.lat?.toFixed(5) ?? '--'}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3 h-3" />
                  Longitude
                </div>
                <div className="font-mono text-sm">{currentGps?.lng?.toFixed(5) ?? '--'}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="w-3 h-3" />
                  Recording
                </div>
                <div className="font-mono text-sm">
                  {isRecording ? formatDuration(recordingDuration) : '--:--'}
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Gauge className="w-3 h-3" />
                  Max Speed
                </div>
                <div className="font-mono text-sm">{maxSpeed > 0 ? `${maxSpeed} MPH` : '--'}</div>
              </div>
            </div>
            
            {cameraPermission === 'denied' && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Camera access denied</span>
                </div>
                <p className="text-xs text-red-500 mt-1">
                  Enable camera permissions in your browser settings.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Saved Recordings
          </CardTitle>
          <CardDescription>
            {recordings.length} recordings • {formatFileSize(storageUsed)} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading recordings...</div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-muted-foreground">No recordings yet</p>
              <p className="text-sm text-muted-foreground mt-1">Start recording to capture your journeys</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Max Speed</TableHead>
                  <TableHead>Avg Speed</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordings.map((recording) => (
                  <TableRow key={recording.id}>
                    <TableCell className="font-medium">
                      {format(new Date(recording.startTime), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{formatDuration(recording.duration)}</TableCell>
                    <TableCell>
                      {recording.startLocation && recording.endLocation ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Tracked
                        </span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>{recording.maxSpeed} MPH</TableCell>
                    <TableCell>{recording.averageSpeed} MPH</TableCell>
                    <TableCell>{formatFileSize(recording.fileSize)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRecording(recording)}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={recording.videoUrl} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRecordingToDelete(recording.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRecording} onOpenChange={() => setSelectedRecording(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Playback Recording</DialogTitle>
            <DialogDescription>
              {selectedRecording && format(new Date(selectedRecording.startTime), 'dd MMM yyyy HH:mm')}
            </DialogDescription>
          </DialogHeader>
          {selectedRecording && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={selectedRecording.videoUrl}
                controls
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recording?</DialogTitle>
            <DialogDescription>
              This will permanently remove the video from storage. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => recordingToDelete && deleteRecordingMutation.mutate(recordingToDelete)}
              disabled={deleteRecordingMutation.isPending}
            >
              {deleteRecordingMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
