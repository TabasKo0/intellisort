"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { UploadCloud, ImageIcon, RefreshCw, Sparkles } from "lucide-react"

interface Detection {
  bbox: [number, number, number, number]
  yolo_confidence: number
  class_name: string
  class_confidence: number
}

interface UploadResponse {
  category: string
  disposal: string
  confidence: number
  bin_color: string
  all_detections?: Detection[]
}

interface ImageUploadProps {
  onSuccess: (result: UploadResponse) => void
  isLoading?: boolean
  result?: UploadResponse | null
}

export function ImageUpload({ onSuccess, isLoading = false, result }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
      setImageSize({ width: 0, height: 0 })
      setDisplaySize({ width: 0, height: 0 })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleUpload = async () => {
    if (!preview) return

    setUploading(true)
    setError(null)

    try {
      const response = await fetch("/api/classify-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      })

      if (!response.ok) throw new Error("Classification failed")

      const data = await response.json()
      onSuccess(data)
      toast.success("Classification complete!")
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    updateDisplaySize()
  }

  const updateDisplaySize = () => {
    if (imageRef.current) {
      setDisplaySize({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      })
    }
  }

  useEffect(() => {
    window.addEventListener("resize", updateDisplaySize)
    return () => window.removeEventListener("resize", updateDisplaySize)
  }, [])

  const renderBoundingBoxes = () => {
    if (!result?.all_detections || imageSize.width === 0 || displaySize.width === 0) return null

    const scaleX = displaySize.width / imageSize.width
    const scaleY = displaySize.height / imageSize.height

    return result.all_detections.map((det, index) => {
      const [x1, y1, x2, y2] = det.bbox
      const left = x1 * scaleX
      const top = y1 * scaleY
      const width = (x2 - x1) * scaleX
      const height = (y2 - y1) * scaleY

      return (
        <div
          key={index}
          className="absolute detection-box pointer-events-none rounded-sm"
          style={{ left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }}
        >
          {/* Label badge */}
          <div className="absolute top-0 left-0 -translate-y-full">
            <span className="inline-block bg-emerald-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap">
              {det.class_name} {(det.class_confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )
    })
  }

  const isBusy = uploading || isLoading

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-emerald-400" />
        <h2 className="text-base font-semibold">Upload Waste Image</h2>
      </div>

      {/* Drop zone */}
      <div
        className={`upload-zone relative cursor-pointer transition-all ${isDragOver ? "drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        {preview ? (
          <div className="relative inline-block w-full">
            {/* Image preview */}
            <img
              ref={imageRef}
              src={preview}
              alt="Preview"
              className="max-h-80 mx-auto rounded-lg block object-contain"
              onLoad={handleImageLoad}
            />
            {renderBoundingBoxes()}

            {/* Change image overlay */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs text-muted-foreground hover:text-emerald-300 hover:border-emerald-500/40 transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Change image
            </button>
          </div>
        ) : (
          <div className="py-14 flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl glass-card flex items-center justify-center text-emerald-400">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Drag &amp; drop an image</p>
              <p className="text-xs text-muted-foreground">or click to browse — JPG, PNG, WEBP</p>
            </div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Classify button */}
      <button
        onClick={handleUpload}
        disabled={!preview || isBusy}
        className="shimmer-btn w-full py-3 rounded-xl text-sm font-semibold text-emerald-950 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:animation-none"
      >
        {isBusy ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 loading-ring inline-block" />
            Classifying…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Classify Waste
          </>
        )}
      </button>
    </div>
  )
}

