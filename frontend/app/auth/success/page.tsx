"use client"

import Link from "next/link"
import { CheckCircle2, Mail } from "lucide-react"

export default function SuccessPage() {
  return (
    <div className="waste-sort-container relative overflow-hidden min-h-screen flex items-center justify-center p-6">
      {/* Ambient orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl top-[-5rem] left-[-5rem]" />
      <div aria-hidden="true" className="pointer-events-none absolute h-64 w-64 rounded-full bg-teal-400/10 blur-3xl bottom-[-4rem] right-[-4rem]" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-scale">
        <div className="glass-card p-10 shadow-2xl text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 rounded-2xl glass-card flex items-center justify-center glow-emerald">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold gradient-text">Account Created!</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Check your email to confirm your account before signing in.
            </p>
          </div>

          {/* Email hint */}
          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground bg-white/5 border border-white/8 rounded-xl p-3">
            <Mail className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Look for a confirmation email in your inbox (and spam folder).</span>
          </div>

          {/* CTA */}
          <Link href="/auth/login">
            <button className="shimmer-btn w-full py-2.5 rounded-xl text-sm font-semibold text-emerald-950">
              Back to Login
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

