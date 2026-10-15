import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  mealPeriod: 'lunch' | 'dinner';
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  mealPeriod
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      initCameras();
    }
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [isOpen]);

  const initCameras = async () => {
    try {
      setCameraError(null);
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prefer back camera ("environment") if available
        const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        const defaultId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(defaultId);
        startScannerWithCamera(defaultId);
      } else {
        setCameraError('No video camera devices found on this device.');
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError('Camera access was denied or not supported in this browser. Please enable camera permissions.');
    }
  };

  const startScannerWithCamera = async (cameraId: string) => {
    try {
      await stopScanner();
      setCameraError(null);

      const scanner = new Html5Qrcode('qr-reader-target');
      scannerRef.current = scanner;

      let lastScanned = '';
      let lastScannedTime = 0;

      await scanner.start(
        cameraId,
        {
          fps: 12,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce rapid re-scans of identical text within 2.5 seconds
          if (decodedText === lastScanned && now - lastScannedTime < 2500) {
            return;
          }
          lastScanned = decodedText;
          lastScannedTime = now;

          onScanSuccess(decodedText);
        },
        () => {
          // Frame parse error ignored
        }
      );

      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      if (isMountedRef.current) {
        setCameraError(`Could not start camera feed: ${err?.message || 'Permission denied'}`);
        setIsScanning(false);
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error:', e);
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScannerWithCamera(newId);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 27, 26, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '20px'
    }}>
      <div className="card" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '28px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="eyebrow" style={{ color: 'var(--color-gold)' }}>Live Optical Scan</span>
            <h3 style={{ fontSize: '22px', marginTop: '2px' }}>Camera QR Scanner</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '2px' }}>
              Active slot: <strong style={{ textTransform: 'capitalize', color: 'var(--color-ink)' }}>{mealPeriod}</strong> • Point at member's phone pass
            </p>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="btn btn-outline btn-pill"
            style={{ padding: '8px' }}
            title="Close Camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Camera size={16} color="var(--color-stone)" />
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cam.id.slice(0, 6)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Scanner Viewfinder Box */}
        <div style={{
          position: 'relative',
          width: '100%',
          minHeight: '300px',
          backgroundColor: '#0d0d0d',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* HTML5 QR Code Mount Node */}
          <div id="qr-reader-target" style={{ width: '100%', height: '100%' }} />

          {/* Error Message if camera failed */}
          {cameraError && (
            <div style={{
              position: 'absolute',
              inset: 0,
              padding: '24px',
              backgroundColor: '#fff4f2',
              color: 'var(--color-error)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={32} />
              <p style={{ fontSize: '14px', lineHeight: 1.4 }}>{cameraError}</p>
              <button
                onClick={initCameras}
                className="btn btn-outline btn-pill"
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={14} /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Help tip & Dismiss */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
            {isScanning ? '● Camera active — hold steady' : 'Connecting to camera...'}
          </span>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '13px' }}
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
