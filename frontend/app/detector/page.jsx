"use client";
import { useRef, useEffect, useState } from 'react';

export default function DetectorPage() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stats, setStats] = useState({ category: 'Waiting...', conf: 0 });
    const [active, setActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState(null);

    const checkCameraPermission = async () => {
        try {
            if (!navigator.permissions || !navigator.permissions.query) {
                return null;
            }
            const permission = await navigator.permissions.query({ name: 'camera' });
            setPermissionStatus(permission.state);
            return permission.state;
        } catch (err) {
            console.log('Permission query not supported');
            return null;
        }
    };

    const startCamera = async () => {
        setLoading(true);
        setError(null);
        try {
            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment'
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setActive(true);
                setPermissionStatus('granted');
            }
        } catch (err) {
            let errorMessage = 'Failed to access camera';
            
            if (err.name === 'NotAllowedError') {
                errorMessage = 'Camera permission denied. Please allow camera access in browser settings.';
                setPermissionStatus('denied');
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'No camera found. Please check your device.';
                setPermissionStatus('notfound');
            } else if (err.name === 'NotReadableError') {
                errorMessage = 'Camera is already in use by another application.';
            } else if (err.name === 'SecurityError') {
                errorMessage = 'Camera access is not allowed in insecure context (HTTPS required).';
            }
            
            setError(errorMessage);
            console.error('Camera error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkCameraPermission();
    }, []);

    const loop = async () => {
        if (!active || !videoRef.current) return;

        // Capture Frame
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.6);

        try {
            // Call our Next.js API Proxy
            const res = await fetch('/api/proxy', {
                method: 'POST',
                body: JSON.stringify({ image: base64 }),
            });
            const data = await res.json();

            if (data.all_detections) {
                setStats({ category: data.category, conf: data.confidence });
                drawBoxes(data.all_detections);
            }
        } catch (e) { console.error(e); }

        // Recursive call for the next frame ONLY after response
        requestAnimationFrame(loop);
    };

    const drawBoxes = (detections) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 640, 480);
        ctx.strokeStyle = '#10b981'; // Emerald Green
        ctx.lineWidth = 4;
        ctx.font = '18px Arial';
        ctx.fillStyle = '#10b981';

        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.bbox;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.fillRect(x1, y1 - 25, 150, 25);
            ctx.fillStyle = 'white';
            ctx.fillText(`${det.class_name} ${Math.round(det.class_confidence * 100)}%`, x1 + 5, y1 - 7);
            ctx.fillStyle = '#10b981';
        });
    };

    useEffect(() => { if (active) loop(); }, [active]);

    return (
        <div className="flex flex-col items-center p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-emerald-800 mb-6">IntelliSort Live Feed</h1>
            
            {error && (
                <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded w-full max-w-[640px]">
                    <p className="font-bold">Camera Access Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}
            
            <div className="relative rounded-3xl overflow-hidden border-8 border-white shadow-2xl">
                <video ref={videoRef} autoPlay muted className="w-[640px] h-[480px] object-cover" />
                <canvas ref={canvasRef} width={640} height={480} className="absolute top-0 left-0" />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-[640px]">
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <p className="text-xs text-gray-400 uppercase font-bold">Detected</p>
                    <p className="text-2xl font-black text-gray-800">{stats.category}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm">
                    <p className="text-xs text-gray-400 uppercase font-bold">Confidence</p>
                    <p className="text-2xl font-black text-emerald-600">{Math.round(stats.conf * 100)}%</p>
                </div>
            </div>

            {!active && (
                <div className="mt-8 w-full max-w-[640px]">
                    {permissionStatus === 'denied' && (
                        <p className="text-sm text-red-600 mb-4 text-center font-semibold">
                            ⚠️ You denied camera access. Please check your browser settings to grant permission.
                        </p>
                    )}
                    <button 
                        onClick={startCamera} 
                        disabled={loading || permissionStatus === 'denied'}
                        className="w-full px-12 py-4 bg-emerald-600 text-white font-bold rounded-full shadow-lg hover:bg-emerald-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? 'Requesting Camera Access...' : 'ACTIVATE SYSTEM'}
                    </button>
                </div>
            )}
        </div>
    );
}