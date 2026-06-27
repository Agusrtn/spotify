import React, { useEffect, useRef } from 'react';
import { Activity, BarChart2, Video, X, Zap } from 'lucide-react';

const SongVisualizer = ({ audioRef, isPlaying, mode, setMode, visualizerUrl = '', onClose }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const hasVideoVisualizer = Boolean(String(visualizerUrl || '').trim());

  useEffect(() => {
    if (hasVideoVisualizer) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Keep CSS size stable (prevents visual stretching)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const nextW = Math.max(1, Math.round(rect.width * dpr));
      const nextH = Math.max(1, Math.round(rect.height * dpr));

      if (canvas.width !== nextW) canvas.width = nextW;
      if (canvas.height !== nextH) canvas.height = nextH;

      // Reset transform to avoid cumulative ctx.scale()
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Web Audio API - create fresh per component mount
    let analyser = null;
    let audioCtx = null;
    let sourceNode = null;

    const initAudio = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;

        if (audioRef?.current) {
          sourceNode = audioCtx.createMediaElementSource(audioRef.current);
          sourceNode.connect(analyser);
          analyser.connect(audioCtx.destination);
          analyserRef.current = analyser;
          audioContextRef.current = audioCtx;
          sourceRef.current = sourceNode;
        }
      } catch (err) {
        // If this fails (e.g. double-connect), use a fallback analyser
        if (!analyser) {
          analyser = {
            frequencyBinCount: 128,
            getByteFrequencyData: (arr) => {
              for (let i = 0; i < arr.length; i++) {
                arr[i] = 0;
              }
            },
          };
          analyserRef.current = analyser;
        }
      }
    };

    initAudio();

    // Resume audio context on user interaction
    if (audioCtx && isPlaying && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    let timeIndex = 0;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear canvas completely (no motion blur trails)
      ctx.clearRect(0, 0, width, height);

      // Fill with very dark background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      let hasRealData = false;
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > 0) {
            hasRealData = true;
            break;
          }
        }
      }

      timeIndex += isPlaying ? 0.08 : 0.01;

      // If we have no real data, do NOT generate a fake spectrum aggressively.
      // Instead keep the previous dataArray (slower/cleaner visuals) to avoid "feisimo" random animation.
      // We'll only animate subtly using the timeIndex-driven glow in each mode via current dataArray.
      if (!hasRealData) {
        // Leave dataArray as-is (initially zeros). This results in a calmer, consistent look
        // rather than a synthetic spectrum.
      }

      if (mode === 'bars') {
        // NEON BARS
        const barWidth = (width / bufferLength) * 1.8;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.8;

          // Color gradient per bar - yellow to white
          const hue = 42 + (i / bufferLength) * 10;
          ctx.fillStyle = `hsl(${hue}, 95%, ${45 + (dataArray[i] / 255) * 40}%)`;

          ctx.beginPath();
          const barW = Math.max(2, barWidth - 2);
          const r = Math.min(4, barW / 2);
          const bx = x;
          const by = height - barHeight;
          ctx.moveTo(bx + r, by);
          ctx.lineTo(bx + barW - r, by);
          ctx.quadraticCurveTo(bx + barW, by, bx + barW, by + r);
          ctx.lineTo(bx + barW, height);
          ctx.lineTo(bx, height);
          ctx.lineTo(bx, by + r);
          ctx.quadraticCurveTo(bx, by, bx + r, by);
          ctx.closePath();
          ctx.fill();

          // Top glow on high peaks
          if (dataArray[i] > 200) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 20;
            ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
            ctx.fillRect(bx, height - barHeight - 3, barW, 3);
            ctx.shadowBlur = 0;
          }

          x += barWidth;
        }
      } else if (mode === 'wave') {
        // WAVE MODE - single clean wave with glow
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        for (let i = 0; i < width; i += 2) {
          const dataIndex = Math.min(
            bufferLength - 1,
            Math.floor((i / width) * bufferLength)
          );
          const amplitude = (dataArray[dataIndex] / 255) * height * 0.35 + 8;
          const angle = (i / width) * Math.PI * 3 + timeIndex * 0.5;
          const y = height / 2 + Math.sin(angle) * amplitude;

          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Second softer wave layer
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < width; i += 3) {
          const dataIndex = Math.min(
            bufferLength - 1,
            Math.floor((i / width) * bufferLength)
          );
          const amplitude = ((dataArray[dataIndex] || 0) / 255) * height * 0.25 + 5;
          const angle = (i / width) * Math.PI * 3 + timeIndex * 0.5 + 0.3;
          const y = height / 2 + Math.sin(angle) * amplitude;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
      } else if (mode === 'pulsar') {
        // PULSAR MODE - clean circular spectrum
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.2;

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const pulseScale = 1 + (avg / 255) * 0.12;
        const radius = baseRadius * pulseScale;

        // Background glow
        const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius * 2);
        glow.addColorStop(0, 'rgba(250, 204, 21, 0.08)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Outer spectrum ring
        const numBars = Math.min(80, Math.floor(bufferLength * 0.6));
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2 - Math.PI / 2;
          const dataIndex = Math.floor((i / numBars) * bufferLength);
          const val = dataArray[dataIndex] / 255;
          const len = 4 + val * 40;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + len);
          const y2 = centerY + Math.sin(angle) * (radius + len);

          ctx.strokeStyle = `hsla(42, 100%, ${50 + val * 30}%, ${0.4 + val * 0.5})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Center disc
        ctx.shadowColor = 'rgba(250, 204, 21, 0.3)';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Grooves
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let r = radius - 8; r > 8; r -= 10) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Center label
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Cleanup AudioContext
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      analyserRef.current = null;
      audioContextRef.current = null;
      sourceRef.current = null;
    };
    // We re-create AudioContext on every re-mount to avoid double-connect crashes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioRef, isPlaying, mode, hasVideoVisualizer]);

  if (hasVideoVisualizer) {
    return (
      <div className="relative w-full h-full overflow-hidden rounded-[28px] bg-black border border-white/10">
        <video
          key={visualizerUrl}
          src={visualizerUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20 pointer-events-none" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/65 border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
          <Video size={13} />
          Video visualizer
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:border-white/40 transition-all"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ overflow: 'hidden' }}>
      <canvas ref={canvasRef} className="w-full h-full min-h-[280px] max-h-[60vh] rounded-[28px] bg-black border border-white/5" />
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-gray-300 hover:text-white hover:border-white/40 transition-all"
        >
          <X size={16} />
        </button>
      )}

      <div className="absolute top-4 flex items-center bg-black/85 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 gap-1.5 z-10 shadow-xl">
        <button
          type="button"
          onClick={() => setMode('bars')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'bars' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white'}`}
        >
          <BarChart2 size={13} />
          Barras
        </button>
        <button
          type="button"
          onClick={() => setMode('wave')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'wave' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white'}`}
        >
          <Activity size={13} />
          Ondas
        </button>
        <button
          type="button"
          onClick={() => setMode('pulsar')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'pulsar' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-gray-400 hover:text-white'}`}
        >
          <Zap size={13} />
          Pulsar
        </button>
      </div>
    </div>
  );
};

export default SongVisualizer;
