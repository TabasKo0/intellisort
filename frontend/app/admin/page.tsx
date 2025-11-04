"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Header } from "@/components/header"

interface Classification {
  id: string
  user_id: string
  waste_category: string
  disposal_type: string
  confidence: number
  created_at: string
}

interface Profile {
  id: string
  email: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const loadAdminData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check admin status (you can modify this based on your admin logic)
      // For now, we'll allow access to demonstrate the feature
      setIsAdmin(true)

      // Fetch all classifications
      const { data: classData, error: classError } = await supabase
        .from("waste_classifications")
        .select("*")
        .order("created_at", { ascending: false })

      if (classError) {
        console.error("Error fetching classifications:", classError)
      } else {
        setClassifications(classData || [])
      }

      // Fetch all profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (profileError) {
        console.error("Error fetching profiles:", profileError)
      } else {
        setProfiles(profileData || [])
      }

      setLoading(false)
    }

    loadAdminData()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (!isAdmin) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have permission to access the admin dashboard.</p>
            <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading admin dashboard...</p>
      </div>
    )
  }

  // Calculate statistics
  const totalUsers = profiles.length
  const totalClassifications = classifications.length
  const avgConfidence =
    classifications.length > 0
      ? ((classifications.reduce((sum, item) => sum + item.confidence, 0) / classifications.length) * 100).toFixed(1)
      : 0

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

  const classificationsByDay = classifications
    .reduce(
      (acc, item) => {
        const date = new Date(item.created_at).toLocaleDateString()
        const existing = acc.find((x) => x.date === date)
        if (existing) {
          existing.count++
        } else {
          acc.push({ date, count: 1 })
        }
        return acc
      },
      [] as Array<{ date: string; count: number }>,
    )
    .slice(-7)

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"]

  return (
    <div className="waste-sort-container min-h-screen pb-12">
      <Header title="Admin Dashboard" subtitle="System-wide analytics and monitoring" showProfileButton={true} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700">{totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Classifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700">{totalClassifications}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">{avgConfidence}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Waste Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-700">{wasteByCategory.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Classifications by Category</CardTitle>
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
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disposal Methods Distribution</CardTitle>
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
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Classifications Trend (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {classificationsByDay.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={classificationsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Classifications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => {
                      const userClassifications = classifications.filter((c) => c.user_id === profile.id)
                      return (
                        <tr key={profile.id} className="border-b border-border hover:bg-muted/50 transition">
                          <td className="py-3 px-4 font-medium text-emerald-700">{profile.email}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              {userClassifications.length}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No users registered yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Classifications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Classifications</CardTitle>
          </CardHeader>
          <CardContent>
            {classifications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold">Category</th>
                      <th className="text-left py-3 px-4 font-semibold">Disposal Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Confidence</th>
                      <th className="text-left py-3 px-4 font-semibold">User Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classifications.slice(0, 20).map((item) => {
                      const userProfile = profiles.find((p) => p.id === item.user_id)
                      return (
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
                          <td className="py-3 px-4 text-muted-foreground">{userProfile?.email}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No classifications yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
