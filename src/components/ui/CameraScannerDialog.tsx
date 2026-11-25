import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface CameraScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

export function CameraScannerDialog({
  open,
  onClose,
  onDetected,
}: CameraScannerDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [cameraError, setCameraError] = useState<string>('');
  const [detectorSupported, setDetectorSupported] = useState<boolean>(true);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;
    let scanTimer: number | undefined;

    const startScanner = async () => {
      setCameraError('');
      setManualCode('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Camera access requires HTTPS and a supported mobile or desktop browser.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }

        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as MediaTrackCapabilities & {
          torch?: boolean;
        };
        setTorchSupported(Boolean(caps?.torch));

        const DetectorCtor = (
          window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
        ).BarcodeDetector;

        if (!DetectorCtor) {
          setDetectorSupported(false);
          return;
        }

        setDetectorSupported(true);
        const detector = new DetectorCtor({
          formats: [
            'ean_13',
            'ean_8',
            'upc_a',
            'upc_e',
            'code_128',
            'code_39',
            'qr_code',
          ],
        });

        const scanFrame = async () => {
          if (cancelled || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            try {
              const results = await detector.detect(videoRef.current);
              const code = results.find((r) => r.rawValue?.trim())?.rawValue?.trim();
              if (code) {
                stopCamera();
                onDetectedRef.current(code);
                return;
              }
            } catch {
              // Ignore transient frame decode errors
            }
          }
          scanTimer = window.setTimeout(scanFrame, 180);
        };

        scanTimer = window.setTimeout(scanFrame, 250);
      } catch (err) {
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in browser settings and try again.'
            : 'Unable to open device camera. You can still enter the barcode or SKU below.';
        setCameraError(msg);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (scanTimer !== undefined) {
        window.clearTimeout(scanTimer);
      }
      stopCamera();
    };
  }, [open]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      // Ignore if device rejects torch toggle
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    stopCamera();
    onDetected(trimmed);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-indigo-600" />
          <h1 id={titleId} className="text-sm font-semibold text-slate-900">
            Mobile Barcode Scanner
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-950 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {!cameraError && (
            <div className="pointer-events-none absolute inset-6 rounded-lg border-2 border-indigo-400/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-5 text-center">
              <p className="text-xs leading-relaxed text-slate-200">{cameraError}</p>
            </div>
          )}
        </div>

        {!cameraError && (
          <p className="text-xs text-slate-500 text-center">
            {detectorSupported
              ? 'Point your camera at a product barcode (EAN-13, UPC, or Code 128).'
              : 'Live auto-scan is not supported in this browser. Enter the barcode below or use Chrome/Edge on Android.'}
          </p>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2 pt-1">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Or type barcode / SKU manually"
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
          <Button type="submit" size="sm" className="h-10 px-4">
            Add
          </Button>
        </form>
      </div>
    </dialog>
  );
}
