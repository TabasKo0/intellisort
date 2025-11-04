"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

interface HeaderProps {
  title: string
  subtitle?: string
  showProfileButton?: boolean
  showBackButton?: boolean
  backHref?: string
}

export function Header({ title, subtitle, showProfileButton = true, showBackButton = false, backHref }: HeaderProps) {
  const router = useRouter()

  return (
    <header className="border-b border-emerald-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-emerald-700">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="space-x-2 flex items-center">
          {showBackButton && backHref && (
            <Link href={backHref}>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-transparent"
              >
                Back
              </Button>
            </Link>
          )}

          {showProfileButton && (
            <Link href="/dashboard/profile">
              <Button
                variant="outline"
                size="icon"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-transparent"
                title="Profile"
              >
                <User className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
