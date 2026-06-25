import React, { useEffect, useRef } from 'react';
import { Activity, BarChart2, Zap } from 'lucide-react';

// Persist the audio nodes globally so we don't reconnect them multiple times and crash
let globalAudioContext = null;
let globalAnalyser = null;
let globalSourceNode = null;

const SongVisualizer = ({ audioRef, isPlaying, mode, setMode }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Web Audio API nodes
    if (audioRef?.current) {
      try {
        if (!globalAudioContext) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          globalAudioContext = new AudioContextClass();
          globalAnalyser = globalAudioContext.createAnalyser();
          globalAnalyser.fftSize = 256;
          
          // Connect audioRef to analyser
          globalSourceNode = globalAudioContext.createMediaElementSource(audioRef.current);
          globalSourceNode.connect(globalAnalyser);
          globalAnalyser.connect(globalAudioContext.destination);
        }
      } catch (err) {
        console.warn('Web Audio API connection failed (possibly double-connected or CORS blocked):', err);
      }
    }

    // Try to resume AudioContext on play
    if (globalAudioContext && isPlaying) {
      if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume().catch(() => {});
      }
    }

    // Data arrays
    const bufferLength = globalAnalyser ? globalAnalyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    let timeIndex = 0;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear canvas with a very soft semi-transparent overlay for motion blur trails
      ctx.fillStyle = 'rgba(2, 2, 2, 0.25)';
      ctx.fillRect(0, 0, width, height);

      let hasRealData = false;
      if (globalAnalyser && isPlaying) {
        globalAnalyser.getByteFrequencyData(dataArray);
        // Check if there is actual non-zero audio content
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > 0) {
            hasRealData = true;
            break;
          }
        }
      }

      timeIndex += isPlaying ? 0.05 : 0.005;

      // If we don't have real data (silent, paused, or CORS blocked), generate simulated fallback data
      if (!hasRealData) {
        for (let i = 0; i < bufferLength; i++) {
          // Pulse simulation using sine waves
          const pulse = Math.sin(timeIndex + i * 0.1) * Math.cos(timeIndex * 0.5 + i * 0.05);
          const baseValue = isPlaying ? 90 : 25; // quieter when paused
          dataArray[i] = Math.max(0, baseValue + pulse * baseValue);
        }
      }

      // Draw depending on mode
      if (mode === 'bars') {
        // --- NEON BARS MODE ---
        const barWidth = (width / bufferLength) * 1.6;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.75;

          // Glowing gradients
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, '#f59e0b'); // amber
          gradient.addColorStop(0.5, '#eab308'); // yellow
          gradient.addColorStop(1, '#ffffff'); // white top

          ctx.fillStyle = gradient;
          
          // Draw bar
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [4, 4, 0, 0]);
          } else {
            ctx.rect(x, height - barHeight, barWidth - 2, barHeight);
          }
          ctx.fill();

          // Suble glow effect on high frequencies
          if (i % 4 === 0 && dataArray[i] > 180) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#facc15';
            ctx.fillRect(x, height - barHeight - 4, barWidth - 2, 2);
            ctx.shadowBlur = 0; // reset
          }

          x += barWidth;
        }
      } else if (mode === 'wave') {
        // --- RETRO SINE WAVE MODE ---
        ctx.lineWidth = 3;
        
        // Draw 3 layers of waves for rich visual depth
        const wavesCount = 3;
        const colors = [
          'rgba(250, 204, 21, 0.8)', // bright yellow
          'rgba(245, 158, 11, 0.5)', // amber
          'rgba(255, 255, 255, 0.3)', // white/gray
        ];
        
        for (let w = 0; w < wavesCount; w++) {
          ctx.strokeStyle = colors[w];
          ctx.beginPath();
          
          const speed = (w + 1) * 0.3;
          const shift = w * Math.PI * 0.5;

          for (let i = 0; i < width; i++) {
            // Map x coordinate to frequency bin index
            const dataIndex = Math.min(
              bufferLength - 1,
              Math.floor((i / width) * bufferLength)
            );
            const amplitude = (dataArray[dataIndex] / 255) * 80 + 5;
            
            // Calculate wave y position
            const angle = (i / width) * Math.PI * 4 + timeIndex * speed + shift;
            const y = height / 2 + Math.sin(angle) * amplitude;

            if (i === 0) {
              ctx.moveTo(i, y);
            } else {
              ctx.lineTo(i, y);
            }
          }
          ctx.stroke();
        }
      } else if (mode === 'pulsar') {
        // --- CIRCULAR SPECTRUM / PULSAR MODE ---
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;
        
        // Calculate average volume to pulse the center circle
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const pulseScale = 1 + (average / 255) * 0.15;
        const radius = baseRadius * pulseScale;

        // Draw radial glowing background behind pulsar
        const bgGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.8);
        bgGlow.addColorStop(0, 'rgba(250, 204, 21, 0.12)');
        bgGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.05)');
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGlow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw outer spectrum lines
        const numPoints = 120;
        ctx.lineWidth = 2.5;
        
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          // Loop frequency indices
          const dataIndex = Math.min(
            bufferLength - 1,
            Math.floor((Math.abs(numPoints / 2 - i) / (numPoints / 2)) * bufferLength)
          );
          
          const audioVal = dataArray[dataIndex];
          const offset = (audioVal / 255) * 60;
          
          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + offset);
          const y2 = centerY + Math.sin(angle) * (radius + offset);

          // Color gradient for the bars
          const lineGrad = ctx.createLinearGradient(x1, y1, x2, y2);
          lineGrad.addColorStop(0, 'rgba(250, 204, 21, 0.7)');
          lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
          ctx.strokeStyle = lineGrad;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Draw a central vinyl circle representing a record spinner
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#0f0f0f';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw groove lines on the central record
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let r = radius - 10; r > 10; r -= 12) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw record label center
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioRef, isPlaying, mode]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Canvas */}
      <canvas ref={canvasRef} className="w-full h-full min-h-[320px] md:min-h-[420px] rounded-[40px] bg-black/40 border border-white/5" />

      {/* Visualizer Mode Controls */}
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
