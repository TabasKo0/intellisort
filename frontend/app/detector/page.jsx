"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Activity, Camera, Power, ShieldAlert } from "lucide-react"

export default function DetectorPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const loopActiveRef = useRef(false)

  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const [permissionError, setPermissionError] = useState("")
  const [secureContext, setSecureContext] = useState(true)
  const [supported, setSupported] = useState(true)
  const [permissionRequested, setPermissionRequested] = useState(false)
  const [active, setActive] = useState(false)

  const [stats, setStats] = useState({ category: "Waiting...", conf: 0 })

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!window.isSecureContext) {
      setSecureContext(false)
      setPermissionError("Camera access requires HTTPS or localhost.")
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSupported(false)
      setPermissionError("Camera API is not supported on this browser.")
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) return

    const loadDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = list.filter((device) => device.kind === "videoinput")
        setDevices(videoInputs)
        if (!selectedDeviceId && videoInputs.length) {
          setSelectedDeviceId(videoInputs[0].deviceId)
        }
      } catch (err) {
        setPermissionError("Unable to list camera devices.")
      }
    }
    loadDevices()
  }, [selectedDeviceId, permissionRequested])

  useEffect(() => {
    if (typeof window === "undefined" || permissionRequested || !secureContext || !supported) return

    setPermissionRequested(true)
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        setPermissionError("")
      } catch (error) {
        setPermissionError("Camera access denied. Please enable permissions in browser settings.")
      }
    }
    requestPermission()
  }, [permissionRequested, secureContext, supported])

  const stopCamera = useCallback(() => {
    loopActiveRef.current = false
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setActive(false)
  }, [])

  const startCamera = async () => {
    if (!selectedDeviceId) return
    stopCamera()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDeviceId }, width: 640, height: 480 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setActive(true)
        loopActiveRef.current = true
        setPermissionError("")
      }
    } catch (err) {
      setPermissionError("Could not start camera. It may be in use by another app.")
    }
  }

  const loop = useCallback(async () => {
    if (!loopActiveRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
      if (loopActiveRef.current) requestAnimationFrame(loop)
      return
    }

    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = 640
    tempCanvas.height = 480
    const ctx = tempCanvas.getContext("2d")
    ctx.drawImage(videoRef.current, 0, 0)
    const base64 = tempCanvas.toDataURL("image/jpeg", 0.6)

    try {
      const res = await fetch("/api/proxy", {
        method: "POST",
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()

      if (data.all_detections) {
        setStats({ category: data.category, conf: data.confidence })
        drawBoxes(data.all_detections)
      }
    } catch (e) {
      console.error("AI Loop Error:", e)
    }

    if (loopActiveRef.current) requestAnimationFrame(loop)
  }, [])

  const drawBoxes = (detections) => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext("2d")
    ctx.clearRect(0, 0, 640, 480)
    ctx.strokeStyle = "#23e6ff"
    ctx.lineWidth = 4
    ctx.font = "bold 16px sans-serif"

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      ctx.fillStyle = "#23e6ff"
      ctx.fillRect(x1, y1 - 25, 140, 25)
      ctx.fillStyle = "black"
      ctx.fillText(`${det.class_name} ${Math.round(det.class_confidence * 100)}%`, x1 + 5, y1 - 7)
    })
  }

  useEffect(() => {
    if (active) loop()
  }, [active, loop])

  useEffect(() => () => stopCamera(), [stopCamera])

  const confidencePercent = Math.round(stats.conf * 100)
  const statusLabel = active ? "Live detection" : "Idle"

  return (
    <div className="waste-sort-container min-h-screen pb-16">
      <Header title="Detector" subtitle="Live waste detection" showBackButton backHref="/dashboard" />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {permissionError && (
          <div className="glass-card border border-red-500/40 bg-red-500/10 text-red-100 p-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Camera issue</p>
              <p className="text-sm text-red-100/80">{permissionError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass-card border border-white/10 relative overflow-hidden aspect-[4/3] bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                width={640}
                height={480}
                className="w-full h-full object-contain rounded-[inherit]"
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/60 border border-white/10 px-3 py-1 text-xs">
                <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-slate-400"}`} />
                <span className="text-muted-foreground">{statusLabel}</span>
              </div>

              {!active && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-lg px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl glass-card glow-emerald">
                    <Camera className="h-6 w-6 text-emerald-300" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Enable your camera to start detecting waste in real time. We keep everything on this page to match your dashboard experience.
                  </p>
                  <button
                    onClick={startCamera}
                    disabled={!supported || !secureContext}
                    className="shimmer-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-emerald-950 border border-emerald-500/60 disabled:opacity-50"
                  >
                    Enable Detection
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4 border border-white/10">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.22em]">Classification</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.category}</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.22em]">Confidence</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{confidencePercent}%</p>
                <div className="confidence-bar mt-3">
                  <div className="confidence-bar-fill" style={{ "--progress-width": `${confidencePercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-5 border border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Camera source</p>
                  <p className="text-xs text-muted-foreground">Choose a device and start detection.</p>
                </div>
                <Activity className="h-4 w-4 text-emerald-300" />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Active camera</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-foreground focus:border-emerald-400/60 focus:outline-none"
                >
                  {devices.map((device, i) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={startCamera} disabled={!supported || !secureContext} className="glow-emerald">
                  <Camera className="h-4 w-4" />
                  Start camera
                </Button>
                <Button
                  variant="ghost"
                  onClick={stopCamera}
                  disabled={!active}
                  className="text-red-300 hover:text-red-200"
                >
                  <Power className="h-4 w-4" />
                  Stop
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Use HTTPS or localhost for access.</p>
                <p className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Green dot means live.
                </p>
              </div>
            </div>

            <div className="glass-card p-5 border border-white/10 space-y-3">
              <p className="text-sm font-semibold text-foreground">Safety</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                Permissions stay local to your browser.
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Power className="h-4 w-4" />
                Stop the feed anytime with the red control.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}