"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

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
      // Reset image size and display size when a new image is selected
      setImageSize({ width: 0, height: 0 })
      setDisplaySize({ width: 0, height: 0 })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
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
          className="absolute border-2 border-emerald-500 pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          }}
        >
          <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[10px] px-1 transform -translate-y-full whitespace-nowrap">
            {det.class_name} ({(det.class_confidence * 100).toFixed(0)}%)
          </div>
        </div>
      )
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Waste Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="relative border-2 border-dashed border-emerald-300 rounded-lg p-4 text-center cursor-pointer hover:bg-emerald-50 transition overflow-hidden"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <div className="relative inline-block">
              <img
                ref={imageRef}
                src={preview || "/placeholder.svg"}
                alt="Preview"
                className="max-h-96 mx-auto rounded-lg block"
                onLoad={handleImageLoad}
              />
              {renderBoundingBoxes()}
              <div 
                className="mt-4 text-sm text-muted-foreground hover:text-emerald-600 transition"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Click to change image
              </div>
            </div>
          ) : (
            <div 
              className="py-12 space-y-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-lg font-medium">Drag and drop an image</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          onClick={handleUpload}
          disabled={!preview || uploading || isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {uploading || isLoading ? "Classifying..." : "Classify Waste"}
        </Button>
      </CardContent>
    </Card>
  )
}
