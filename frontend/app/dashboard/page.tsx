"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/image-upload"
import ClassificationResult from "@/components/classification-result"
import { Header } from "@/components/header"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [result, setResult] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
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

      const { data } = await supabase
        .from("waste_classifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      setHistory(data || [])
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="waste-sort-container min-h-screen pb-12">
      <Header title="IntelliSort" subtitle="Smart waste classification system" showProfileButton={true} />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ImageUpload
              onSuccess={(newResult) => {
                setResult(newResult)
                setHistory([newResult, ...history.slice(0, 9)])
              }}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-3xl font-bold text-emerald-600">{history.length}</p>
                  <p className="text-sm text-muted-foreground">Items Sorted</p>
                </div>
                <Link href="/dashboard/analytics">
                  <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 bg-transparent">
                    View Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {result && (
          <div className="mt-8">
            <ClassificationResult {...result} />
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-emerald-700 mb-4">Recent Classifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item, idx) => {
                const displayCategory = item.category ?? item.waste_category
                const displayDisposal = item.disposal ?? item.disposal_type
                return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-emerald-700">{displayCategory}</p>
                        <p className="text-sm text-muted-foreground">{displayDisposal}</p>
                      </div>
                      <p className="text-sm font-medium">{(item.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
