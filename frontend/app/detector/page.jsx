"use client";

import { useRef, useEffect, useState, useCallback } from 'react';

export default function DetectorPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastDeviceIdRef = useRef('');
  const loopActiveRef = useRef(false);

  // --- Logic ported from Scanner ---
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [secureContext, setSecureContext] = useState(true);
  const [supported, setSupported] = useState(true);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [active, setActive] = useState(false);
  
  // Detection Stats
  const [stats, setStats] = useState({ category: 'Waiting...', conf: 0 });

  // 1. Initial Compatibility Check
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setSecureContext(false);
      setPermissionError('Camera access requires HTTPS or localhost.');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSupported(false);
      setPermissionError('Camera API is not supported on this browser.');
    }
  }, []);

  // 2. Load Available Cameras
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    const loadDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = list.filter((device) => device.kind === 'videoinput');
        setDevices(videoInputs);
        if (!selectedDeviceId && videoInputs.length) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        setPermissionError('Unable to list camera devices.');
      }
    };
    loadDevices();
  }, [selectedDeviceId, permissionRequested]);

  // 3. Handle Permissions
  useEffect(() => {
    if (typeof window === 'undefined' || permissionRequested || !secureContext || !supported) return;
    
    setPermissionRequested(true);
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setPermissionError('');
      } catch (error) {
        setPermissionError('Camera access denied. Please enable permissions in browser settings.');
      }
    };
    requestPermission();
  }, [permissionRequested, secureContext, supported]);

  const stopCamera = useCallback(() => {
    loopActiveRef.current = false;
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  const startCamera = async () => {
    if (!selectedDeviceId) return;
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: { exact: selectedDeviceId }, width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setActive(true);
        loopActiveRef.current = true;
        setPermissionError('');
      }
    } catch (err) {
      setPermissionError('Could not start camera. It may be in use by another app.');
    }
  };

  // 4. Request-on-Response AI Loop
  const loop = useCallback(async () => {
    if (!loopActiveRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
      if (loopActiveRef.current) requestAnimationFrame(loop);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 640;
    tempCanvas.height = 480;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const base64 = tempCanvas.toDataURL('image/jpeg', 0.6);

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (data.all_detections) {
        setStats({ category: data.category, conf: data.confidence });
        drawBoxes(data.all_detections);
      }
    } catch (e) {
      console.error("AI Loop Error:", e);
    }

    if (loopActiveRef.current) requestAnimationFrame(loop);
  }, []);

  const drawBoxes = (detections) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 640, 480);
    ctx.strokeStyle = '#23e6ff';
    ctx.lineWidth = 4;
    ctx.font = 'bold 16px sans-serif';

    detections.forEach(det => {
      const [x1, y1, x2, y2] = det.bbox;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = '#23e6ff';
      ctx.fillRect(x1, y1 - 25, 140, 25);
      ctx.fillStyle = 'black';
      ctx.fillText(`${det.class_name} ${Math.round(det.class_confidence * 100)}%`, x1 + 5, y1 - 7);
    });
  };

  useEffect(() => {
    if (active) loop();
  }, [active, loop]);

  return (
    <div className="min-h-screen bg-[#040008] text-white p-6 flex flex-col items-center">
      <header className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">IntelliSort</p>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ff2fd3] to-[#23e6ff] bg-clip-text text-transparent">
          AI Waste Detector
        </h1>
      </header>

      {permissionError && (
        <div className="w-full max-w-[640px] mb-4 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200">
          {permissionError}
        </div>
      )}

      <div className="w-full max-w-[640px] mb-6 space-y-2">
        <label className="text-xs uppercase tracking-widest text-slate-400">Active Camera Source</label>
        <select
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-[#23e6ff]/50"
        >
          {devices.map((device, i) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${i + 1}`}
            </option>
          ))}
        </select>
      </div>

      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
        <video ref={videoRef} autoPlay muted playsInline className="w-[640px] h-[480px] object-cover" />
        <canvas ref={canvasRef} width={640} height={480} className="absolute top-0 left-0 pointer-events-none" />
        
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <button 
              onClick={startCamera} 
              disabled={!supported || !secureContext}
              className="px-12 py-4 bg-gradient-to-r from-[#ff2fd3] to-[#23e6ff] text-white font-bold rounded-full shadow-lg hover:scale-105 transition disabled:opacity-50"
            >
              ENABLE DETECTION
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[640px]">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Classification</p>
          <p className="text-2xl font-black">{stats.category}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Accuracy</p>
          <p className="text-2xl font-black text-[#23e6ff]">{Math.round(stats.conf * 100)}%</p>
        </div>
      </div>

      {active && (
        <button onClick={stopCamera} className="mt-8 text-xs text-red-400 hover:text-red-300 underline underline-offset-4">
          Emergency System Shutdown
        </button>
      )}
    </div>
  );
}