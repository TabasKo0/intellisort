"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/* Animated floating orb component */
function Orb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl opacity-20 ${className}`}
    />
  )
}

/* Tiny particle element */
function Particle({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute h-1 w-1 rounded-full bg-emerald-400/60"
      style={style}
    />
  )
}

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/auth/login")
  }, [router])

  // Static particle positions to avoid hydration mismatch
  const particles = [
    { top: "15%", left: "10%", animationDelay: "0s",   animationDuration: "4s" },
    { top: "35%", left: "85%", animationDelay: "0.8s", animationDuration: "5s" },
    { top: "70%", left: "20%", animationDelay: "1.5s", animationDuration: "4.5s" },
    { top: "50%", left: "60%", animationDelay: "0.3s", animationDuration: "6s" },
    { top: "80%", left: "75%", animationDelay: "2s",   animationDuration: "3.5s" },
    { top: "25%", left: "45%", animationDelay: "1s",   animationDuration: "5.5s" },
  ]

  return (
    <div className="waste-sort-container relative overflow-hidden min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Background ambient orbs */}
      <Orb className="h-96 w-96 bg-emerald-500 top-[-8rem] left-[-8rem] animate-float" />
      <Orb className="h-80 w-80 bg-teal-400 bottom-[-6rem] right-[-6rem] animate-float-delayed" />
      <Orb className="h-64 w-64 bg-emerald-600 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <Particle
          key={i}
          style={{
            top: p.top,
            left: p.left,
            animationName: "particle-drift",
            animationDelay: p.animationDelay,
            animationDuration: p.animationDuration,
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-xl space-y-8 animate-fade-in-up">
        {/* Logo / icon */}
        <div className="mx-auto h-20 w-20 rounded-2xl glass-card flex items-center justify-center text-4xl animate-float shadow-xl glow-emerald">
          ♻️
        </div>

        <div className="space-y-3">
          <h1 className="text-6xl font-extrabold tracking-tight gradient-text">IntelliSort</h1>
          <p className="text-xl text-emerald-300 font-light tracking-wide">
            Smart waste classification for a sustainable future
          </p>
        </div>

        <p className="text-muted-foreground text-base leading-relaxed">
          Upload an image of waste to instantly learn how to dispose of it correctly using AI.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push("/auth/login")}
            className="shimmer-btn px-8 py-3 rounded-xl text-sm font-semibold text-emerald-950 glow-emerald"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/auth/sign-up")}
            className="glass-card px-8 py-3 rounded-xl text-sm font-semibold text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10 transition-all duration-200"
          >
            Create Account
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          {["AI-Powered", "9 Waste Categories", "Instant Results", "Eco Analytics"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-xs font-medium glass-card text-muted-foreground border border-white/5"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

