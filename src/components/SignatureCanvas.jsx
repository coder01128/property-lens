/**
 * SignatureCanvas — on-device signature capture (PRD §6.4).
 * Works with mouse and touch. Exports a PNG dataUrl via onChange callback.
 */
import { useRef, useState, useEffect } from 'react';

export default function SignatureCanvas({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing]   = useState(false);
  const [hasSig, setHasSig]     = useState(false);

  // Restore persisted signature on mount
  useEffect(() => {
    if (!value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.getContext('2d').drawImage(img, 0, 0);
      setHasSig(true);
    };
    img.src = value;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Configure canvas context on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a28';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  const getXY = (e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left)  * scaleX,
      y: (src.clientY - rect.top)   * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getXY(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const { x, y } = getXY(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasSig) {
      setHasSig(true);
      onChange?.(canvas.toDataURL('image/png'));
    } else {
      onChange?.(canvas.toDataURL('image/png'));
    }
  };

  const stopDraw = () => setDrawing(false);

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onChange?.(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </label>
        {hasSig && (
          <button
            onClick={clear}
            className="text-xs text-red-400 hover:text-red-500 font-medium"
          >
            Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={140}
        className="w-full rounded-card border border-gray-300 dark:border-surface-border bg-white touch-none cursor-crosshair"
        style={{ height: '88px' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        aria-label={`${label} signature pad`}
      />
      {!hasSig && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          Sign above
        </p>
      )}
    </div>
  );
}
