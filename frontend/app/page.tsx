"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/auth/login")
  }, [router])

  return (
    <div className="waste-sort-container min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-emerald-700">IntelliSort</h1>
          <p className="text-xl text-emerald-600">Smart waste classification for a sustainable future</p>
        </div>
        <p className="text-muted-foreground">
          Upload an image of waste to instantly learn how to dispose of it correctly.
        </p>
        <div className="space-x-4">
          <Button onClick={() => router.push("/auth/login")} className="bg-emerald-600 hover:bg-emerald-700">
            Sign In
          </Button>
          <Button
            onClick={() => router.push("/auth/sign-up")}
            variant="outline"
            className="border-emerald-200 text-emerald-700"
          >
            Create Account
          </Button>
        </div>
      </div>
    </div>
  )
}
