"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { Header } from "@/components/header"
import { BarChart2, Target, Tag, Recycle } from "lucide-react"

interface Classification {
  id: string
  waste_category: string
  disposal_type: string
  confidence: number
  created_at: string
  tip: string
}

/* Palette for charts – emerald / teal / cyan + accent colours */
const CHART_COLORS = ["#34d399", "#22d3ee", "#a78bfa", "#fb923c", "#f87171", "#60a5fa"]

/* Custom tooltip shared by all charts */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1">
      {label && <p className="font-semibold text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }} className="font-medium">
          {p.name ?? p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  )
}

/* Stat summary card */
function SummaryCard({
  label,
  value,
  Icon,
  accentClass,
  delay = "0s",
}: {
  label: string
  value: string | number
  Icon: typeof BarChart2
  accentClass: string
  delay?: string
}) {
  return (
    <div
      className="glass-card p-5 stat-card flex items-start gap-4"
      style={{ animationDelay: delay }}
    >
      <div className={`mt-0.5 flex-shrink-0 h-10 w-10 rounded-xl glass-card flex items-center justify-center ${accentClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-3xl font-extrabold ${accentClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [classifications, setClassifications] = useState<Classification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) { router.push("/auth/login"); return }

      const { data } = await supabase
        .from("waste_classifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setClassifications(data || [])
      setLoading(false)
    }
    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center gap-3">
        <span className="h-6 w-6 rounded-full border-2 loading-ring inline-block" />
        <span className="text-muted-foreground">Loading analytics…</span>
      </div>
    )
  }

  /* ── Derived stats ── */
  const wasteByCategory = Object.values(
    classifications.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      const key = item.waste_category
      acc[key] = acc[key] ? { ...acc[key], value: acc[key].value + 1 } : { name: key, value: 1 }
      return acc
    }, {}),
  )

  const disposalByType = Object.values(
    classifications.reduce<Record<string, { name: string; value: number }>>((acc, item) => {
      const key = item.disposal_type
      acc[key] = acc[key] ? { ...acc[key], value: acc[key].value + 1 } : { name: key, value: 1 }
      return acc
    }, {}),
  )

  const avgConfidence =
    classifications.length > 0
      ? classifications.reduce((s, i) => s + i.confidence, 0) / classifications.length
      : 0

  const recyclableCount = classifications.filter((c) => c.disposal_type === "Recyclable").length

  return (
    <div className="waste-sort-container min-h-screen pb-16">
      <Header
        title="My Analytics"
        subtitle="Track your waste sorting journey"
        showProfileButton
        showBackButton
        backHref="/dashboard"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Items Sorted"  value={classifications.length}               Icon={BarChart2} accentClass="text-emerald-400" delay="0s" />
          <SummaryCard label="Avg. Confidence"      value={`${(avgConfidence * 100).toFixed(1)}%`} Icon={Target}   accentClass="text-blue-400"    delay="0.1s" />
          <SummaryCard label="Categories Found"     value={wasteByCategory.length}               Icon={Tag}      accentClass="text-purple-400"  delay="0.2s" />
          <SummaryCard label="Recyclables"          value={recyclableCount}                      Icon={Recycle}  accentClass="text-teal-400"    delay="0.3s" />
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie – waste by category */}
          <div className="glass-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-foreground/80">Waste by Category</h3>
            {wasteByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={wasteByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {wasteByCategory.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No data yet. Start sorting waste!</p>
            )}
          </div>

          {/* Bar – disposal methods */}
          <div className="glass-card p-6 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <h3 className="text-sm font-semibold text-foreground/80">Disposal Methods</h3>
            {disposalByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={disposalByType} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(52,211,153,0.05)" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {disposalByType.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12 text-sm">No data yet</p>
            )}
          </div>
        </div>

        {/* ── Classification history table ── */}
        <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="p-5 border-b border-white/5">
            <h3 className="text-sm font-semibold text-foreground/80">Classification History</h3>
          </div>
          {classifications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs text-muted-foreground">
                    <th className="text-left py-3 px-5 font-medium">Category</th>
                    <th className="text-left py-3 px-5 font-medium">Disposal</th>
                    <th className="text-left py-3 px-5 font-medium">Confidence</th>
                    <th className="text-left py-3 px-5 font-medium">Date</th>
                    <th className="text-left py-3 px-5 font-medium hidden md:table-cell">Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((item) => {
                    const dKey = item.disposal_type.toLowerCase()
                    const badge =
                      dKey === "recyclable" ? "disposal-recyclable"
                      : dKey === "compostable" ? "disposal-compostable"
                      : "disposal-landfill"
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors"
                      >
                        <td className="py-3 px-5 font-medium text-emerald-400">{item.waste_category}</td>
                        <td className="py-3 px-5">
                          <span className={`waste-category-badge text-xs ${badge}`}>
                            {item.disposal_type}
                          </span>
                        </td>
                        <td className="py-3 px-5 tabular-nums">{(item.confidence * 100).toFixed(1)}%</td>
                        <td className="py-3 px-5 text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-5 text-xs text-muted-foreground hidden md:table-cell max-w-[220px] truncate">
                          {item.tip}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12 text-sm">
              No classifications yet. Upload an image to get started!
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

