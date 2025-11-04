"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Header } from "@/components/header"

interface Classification {
  id: string
  waste_category: string
  disposal_type: string
  confidence: number
  created_at: string
  tip: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)

      const { data, error } = await supabase
        .from("waste_classifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching classifications:", error)
      } else {
        setClassifications(data || [])
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading analytics...</p>
      </div>
    )
  }

  // Calculate stats
  const wasteByCategory = classifications.reduce(
    (acc, item) => {
      const existing = acc.find((x) => x.name === item.waste_category)
      if (existing) {
        existing.value++
      } else {
        acc.push({ name: item.waste_category, value: 1 })
      }
      return acc
    },
    [] as Array<{ name: string; value: number }>,
  )

  const disposalByType = classifications.reduce(
    (acc, item) => {
      const existing = acc.find((x) => x.name === item.disposal_type)
      if (existing) {
        existing.value++
      } else {
        acc.push({ name: item.disposal_type, value: 1 })
      }
      return acc
    },
    [] as Array<{ name: string; value: number }>,
  )

  const avgConfidence =
    classifications.length > 0
      ? (classifications.reduce((sum, item) => sum + item.confidence, 0) / classifications.length).toFixed(2)
      : 0

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="waste-sort-container min-h-screen pb-12">
      <Header
        title="My Analytics"
        subtitle="Track your waste sorting journey"
        showProfileButton={true}
        showBackButton={true}
        backHref="/dashboard"
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items Sorted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">{classifications.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{(Number(avgConfidence) * 100).toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{wasteByCategory.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recyclables</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                {classifications.filter((c) => c.disposal_type === "Recyclable").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Waste by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {wasteByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={wasteByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {wasteByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data yet. Start sorting waste to see analytics!
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disposal Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {disposalByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={disposalByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Classifications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Classification History</CardTitle>
          </CardHeader>
          <CardContent>
            {classifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Disposal</th>
                      <th className="text-left py-3 px-4 font-semibold">Confidence</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classifications.map((item) => (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/50 transition">
                        <td className="py-3 px-4 font-medium text-emerald-700">{item.waste_category}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.disposal_type === "Recyclable"
                                ? "bg-green-100 text-green-800"
                                : item.disposal_type === "Compostable"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.disposal_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">{(item.confidence * 100).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-xs">{item.tip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No classifications yet. Upload an image to get started!
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
