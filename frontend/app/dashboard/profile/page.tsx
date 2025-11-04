"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="waste-sort-container min-h-screen pb-12">
      <Header
        title="Profile"
        subtitle="Manage your account"
        showProfileButton={false}
        showBackButton={true}
        backHref="/dashboard"
      />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <p className="text-lg mt-2 text-emerald-700">{user?.email}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="text-sm mt-2 font-mono text-muted-foreground">{user?.id}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Created</label>
              <p className="text-sm mt-2 text-muted-foreground">{new Date(user?.created_at).toLocaleDateString()}</p>
            </div>

            <div className="pt-6 border-t">
              <Button onClick={handleLogout} variant="destructive" className="w-full bg-red-600 hover:bg-red-700">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
