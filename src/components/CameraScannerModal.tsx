import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import type { MealPeriod } from '../types';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  mealPeriod: MealPeriod;
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
        const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        const defaultId = backCam ? backCam.id : devices[0].id;
        setSelectedCameraId(defaultId);
        startScannerWithCamera(defaultId);
      } else {
        setCameraError('No camera devices detected on this device.');
      }
    } catch (err: any) {
      console.error('Camera initialization error:', err);
      setCameraError('Camera access was denied or not supported in this browser. Please grant camera permissions.');
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
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanned && now - lastScannedTime < 2500) {
            return;
          }
          lastScanned = decodedText;
          lastScannedTime = now;

          onScanSuccess(decodedText);
        },
        () => {}
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
      backgroundColor: 'rgba(13, 37, 61, 0.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 150,
      padding: '16px'
    }}>
      <div className="card" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '20px 16px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-modal)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="eyebrow">Optical Validation</span>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '2px' }}>Camera QR Scanner</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
              Active slot: <strong style={{ textTransform: 'capitalize', color: 'var(--color-ink)' }}>{mealPeriod}</strong> • Point at member's pass
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="btn btn-outline btn-pill"
            style={{ padding: '6px', border: 'none', color: 'var(--color-ink-mute)' }}
            title="Close Camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Camera size={14} color="var(--color-ink-mute)" />
            <select
              value={selectedCameraId}
              onChange={handleCameraChange}
              className="form-input"
              style={{ padding: '5px 8px', fontSize: '12px' }}
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
          minHeight: '280px',
          backgroundColor: '#0d253d',
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
              padding: '20px',
              backgroundColor: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={28} />
              <p style={{ fontSize: '13px', lineHeight: 1.4 }}>{cameraError}</p>
              <button
                type="button"
                onClick={initCameras}
                className="btn btn-secondary btn-pill"
                style={{ fontSize: '11px', padding: '3px 10px' }}
              >
                <RefreshCw size={12} /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Help tip & Dismiss */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-mute)' }}>
            {isScanning ? '● Camera active — hold steady' : 'Connecting to camera...'}
          </span>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="btn btn-secondary btn-pill"
            style={{ fontSize: '12px' }}
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
