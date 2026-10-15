import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Utensils, Download } from 'lucide-react';
import { COUNTER_STANDEE_QR } from '../services/api';

interface CounterQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMealPeriod?: 'lunch' | 'dinner';
}

export const CounterQrModal: React.FC<CounterQrModalProps> = ({
  isOpen,
  onClose,
  activeMealPeriod = 'lunch'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, COUNTER_STANDEE_QR, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0d253d',
          light: '#ffffff'
        }
      }, (err) => {
        if (err) console.error('Error generating counter QR:', err);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `Thali_Counter_Standee_QR_${activeMealPeriod}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(13, 37, 61, 0.55)',
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
        padding: '24px',
        boxShadow: 'var(--shadow-modal)',
        textAlign: 'center',
        position: 'relative',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="btn btn-outline btn-pill"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            padding: '6px',
            border: 'none',
            color: 'var(--color-ink-mute)'
          }}
        >
          <X size={18} />
        </button>

        {/* Printable Standee Card Area */}
        <div id="printable-standee" style={{
          border: '2px solid var(--color-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          backgroundColor: '#ffffff',
          marginBottom: '16px'
        }}>
          {/* Standee Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Utensils size={15} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.3px', color: 'var(--color-ink)' }}>
              Thali<span style={{ color: 'var(--color-primary)' }}>.com</span>
            </span>
          </div>

          <span className="eyebrow" style={{ color: 'var(--color-primary)', fontSize: '11px' }}>
            Official Mess Counter Standee
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-ink)', marginTop: '4px' }}>
            Self Check-In Desk
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--color-ink-mute)', marginTop: '2px' }}>
            Active Slot: <strong style={{ textTransform: 'capitalize', color: 'var(--color-ink)' }}>{activeMealPeriod} Service</strong>
          </p>

          {/* QR Canvas */}
          <div style={{
            padding: '12px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-level-1)',
            margin: '16px auto',
            border: '1px solid var(--color-hairline)',
            display: 'inline-block'
          }}>
            <canvas ref={canvasRef} />
          </div>

          <div style={{
            backgroundColor: 'var(--color-canvas-soft)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-hairline)',
            fontSize: '12px',
            color: 'var(--color-ink-secondary)',
            lineHeight: 1.45,
            textAlign: 'left'
          }}>
            <strong>How to Check In:</strong>
            <ol style={{ paddingLeft: '16px', marginTop: '4px' }}>
              <li>Open your <strong>Thali.com</strong> digital pass.</li>
              <li>Tap <strong>"Scan Counter QR"</strong>.</li>
              <li>Show the approved green screen to collect your thali.</li>
            </ol>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-primary btn-pill"
              style={{ flex: 1, gap: '6px' }}
            >
              <Printer size={15} /> Print Standee
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="btn btn-secondary btn-pill"
              style={{ flex: 1, gap: '6px' }}
            >
              <Download size={15} /> Save QR Image
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-pill"
            style={{ width: '100%' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
