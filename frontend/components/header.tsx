"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, ArrowLeft, Leaf } from "lucide-react"

interface HeaderProps {
  title: string
  subtitle?: string
  showProfileButton?: boolean
  showBackButton?: boolean
  backHref?: string
}

export function Header({ title, subtitle, showProfileButton = true, showBackButton = false, backHref }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Left: logo + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-xl glass-card flex items-center justify-center glow-emerald">
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold gradient-text leading-none truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {showBackButton && backHref && (
            <Link href={backHref}>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          )}

          {showProfileButton && (
            <Link href="/dashboard/profile">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

