"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { User, Calendar, Hash, LogOut } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
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
      <div className="waste-sort-container min-h-screen flex items-center justify-center gap-3">
        <span className="h-6 w-6 rounded-full border-2 loading-ring inline-block" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    )
  }

  return (
    <div className="waste-sort-container min-h-screen pb-16">
      <Header
        title="Profile"
        subtitle="Manage your account"
        showProfileButton={false}
        showBackButton
        backHref="/dashboard"
      />

      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="glass-card p-6 space-y-6 animate-fade-in-up">
          {/* Avatar placeholder */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl glass-card flex items-center justify-center text-emerald-400 glow-emerald">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Active member</p>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Info rows */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Hash className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
                <p className="text-sm font-mono text-foreground/70 break-all">{user?.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Account Created</p>
                <p className="text-sm text-foreground/70">
                  {new Date(user?.created_at).toLocaleDateString(undefined, {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/5" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </main>
    </div>
  )
}

