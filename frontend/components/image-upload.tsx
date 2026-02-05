"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState as useReactState } from "react"

interface UploadResponse {
  category: string
  disposal: string
  confidence: number
  bin_color: string
}

interface ImageUploadProps {
  onSuccess: (result: UploadResponse) => void
  isLoading?: boolean
}

export function ImageUpload({ onSuccess, isLoading = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useReactState(false)
  const [error, setError] = useReactState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
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

      const result: UploadResponse = await response.json()
      onSuccess(result)
      setPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Waste Image</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="border-2 border-dashed border-emerald-300 rounded-lg p-8 text-center cursor-pointer hover:bg-emerald-50 transition"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          {preview ? (
            <div className="space-y-4">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
              <p className="text-sm text-muted-foreground">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-2">
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
