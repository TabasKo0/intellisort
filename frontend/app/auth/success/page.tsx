"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SuccessPage() {
  return (
    <div className="waste-sort-container min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl text-emerald-700">Account Created!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">Check your email to confirm your account before signing in.</p>
          <Link href="/auth/login">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
