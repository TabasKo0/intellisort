"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ImageUpload } from "@/components/image-upload"
import ClassificationResult from "@/components/classification-result"
import { Header } from "@/components/header"
import Link from "next/link"
import { Trash2, BarChart2, Recycle, Leaf, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/* Tiny stat card */
function StatCard({
  label,
  value,
  accentClass = "text-emerald-400",
  delay = "0s",
}: {
  label: string
  value: string | number
  accentClass?: string
  delay?: string
}) {
  return (
    <div
      className="glass-card p-5 stat-card space-y-1"
      style={{ animationDelay: delay }}
    >
      <p className={`text-3xl font-extrabold ${accentClass}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/* Disposal icon helper */
function DisposalIcon({ disposal }: { disposal?: string }) {
  const d = (disposal ?? "").toLowerCase()
  if (d === "recyclable") return <Recycle className="h-3.5 w-3.5 text-emerald-400" />
  if (d === "compostable") return <Leaf className="h-3.5 w-3.5 text-amber-400" />
  return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [result, setResult] = useState<any | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("waste_classifications").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete record")
    } else {
      setHistory((h) => h.filter((item) => item.id !== id))
      toast.success("Classification deleted")
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      const { data } = await supabase
        .from("waste_classifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      setHistory(data || [])
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="waste-sort-container min-h-screen flex items-center justify-center gap-3">
        <span className="h-6 w-6 rounded-full border-2 loading-ring inline-block" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    )
  }

  const recyclableCount = history.filter(
    (i) => (i.disposal ?? i.disposal_type ?? "").toLowerCase() === "recyclable",
  ).length

  return (
    <div className="waste-sort-container min-h-screen pb-16">
      <Header title="IntelliSort" subtitle="Smart waste classification" showProfileButton />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Items Sorted"    value={history.length} delay="0s" />
          <StatCard label="Recyclables"     value={recyclableCount} accentClass="text-teal-400" delay="0.1s" />
          <StatCard
            label="Categories Found"
            value={new Set(history.map((i) => i.waste_category ?? i.category)).size}
            accentClass="text-purple-400"
            delay="0.2s"
          />
          <div
            className="glass-card p-5 stat-card flex flex-col justify-between"
            style={{ animationDelay: "0.3s" }}
          >
            <p className="text-xs text-muted-foreground">Analytics</p>
            <Link href="/dashboard/analytics">
              <button className="shimmer-btn w-full mt-3 py-2 rounded-xl text-xs font-semibold text-emerald-950 flex items-center justify-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" />
                View Details
              </button>
            </Link>
          </div>
        </div>

        {/* ── Upload + result ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <ImageUpload
              onSuccess={(newResult) => {
                setResult(newResult)
                setHistory([newResult, ...history.slice(0, 9)])
              }}
              result={result}
            />
          </div>

          {result && (
            <div className="lg:col-span-2">
              <ClassificationResult {...result} />
            </div>
          )}
        </div>

        {/* ── Recent classifications ── */}
        {history.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold gradient-text">Recent Classifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item, idx) => {
                const displayCategory = item.category ?? item.waste_category ?? "Unknown"
                const displayDisposal = item.disposal ?? item.disposal_type ?? ""
                const disposalKey = displayDisposal.toLowerCase()
                const disposalBadge =
                  disposalKey === "recyclable" ? "disposal-recyclable"
                  : disposalKey === "compostable" ? "disposal-compostable"
                  : "disposal-landfill"

                return (
                  <div
                    key={item.id ?? idx}
                    className="glass-card history-card p-4 relative group"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          aria-label="Delete classification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-card border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete record?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this classification from your history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="glass-card border-white/10">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Card content */}
                    <div className="flex items-start justify-between pr-6">
                      <div className="space-y-2 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{displayCategory}</p>
                        <span className={`waste-category-badge text-xs ${disposalBadge} gap-1`}>
                          <DisposalIcon disposal={displayDisposal} />
                          {displayDisposal}
                        </span>
                      </div>
                      <div className="flex-shrink-0 text-right ml-3">
                        <p className="text-xl font-bold text-emerald-400 leading-none">
                          {(item.confidence * 100).toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">confidence</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

