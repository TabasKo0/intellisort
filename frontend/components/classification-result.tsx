"use client"

import { CheckCircle2, Trash2, Recycle, Leaf } from "lucide-react"

interface ClassificationResultProps {
  category: string
  disposal: string
  confidence: number
  bin_color: string
}

/* Per-category visual config: emoji, accent colour, and CSS badge class */
const categoryConfig: Record<string, { icon: string; accentClass: string; badgeClass: string }> = {
  plastic:           { icon: "🥤", accentClass: "text-blue-400",   badgeClass: "waste-category-plastic" },
  "food organics":   { icon: "🍎", accentClass: "text-amber-400",  badgeClass: "waste-category-organic" },
  organic:           { icon: "🍎", accentClass: "text-amber-400",  badgeClass: "waste-category-organic" },
  metal:             { icon: "🥫", accentClass: "text-slate-300",  badgeClass: "waste-category-metal" },
  glass:             { icon: "🍾", accentClass: "text-cyan-400",   badgeClass: "waste-category-glass" },
  paper:             { icon: "📄", accentClass: "text-orange-400", badgeClass: "waste-category-paper" },
  cardboard:         { icon: "📦", accentClass: "text-orange-400", badgeClass: "waste-category-paper" },
  "textile trash":   { icon: "👕", accentClass: "text-purple-400", badgeClass: "waste-category-plastic" },
  vegetation:        { icon: "🌿", accentClass: "text-green-400",  badgeClass: "waste-category-organic" },
  "miscellaneous trash": { icon: "🗑️", accentClass: "text-red-400", badgeClass: "waste-category-landfill" },
}

const disposalConfig: Record<string, { label: string; badgeClass: string; Icon: typeof Recycle }> = {
  recyclable:   { label: "Recyclable",   badgeClass: "disposal-recyclable",  Icon: Recycle },
  compostable:  { label: "Compostable",  badgeClass: "disposal-compostable", Icon: Leaf },
  landfill:     { label: "Landfill",     badgeClass: "disposal-landfill",    Icon: Trash2 },
}

export default function ClassificationResult({
  category,
  disposal,
  confidence,
  bin_color,
}: ClassificationResultProps) {
  const catKey = category.toLowerCase()
  const cfg = categoryConfig[catKey] ?? { icon: "⚠️", accentClass: "text-red-400", badgeClass: "waste-category-landfill" }

  const disposalKey = disposal.toLowerCase()
  const disposalCfg = disposalConfig[disposalKey] ?? disposalConfig.landfill
  const DisposalIcon = disposalCfg.Icon

  const pct = Math.round(confidence * 100)

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in-scale">
      {/* Title row */}
      <div className="flex items-center gap-3">
        <span className="text-3xl" role="img" aria-label={category}>{cfg.icon}</span>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Classification Result</h3>
          <p className={`text-2xl font-extrabold ${cfg.accentClass}`}>{category}</p>
        </div>
        <CheckCircle2 className="ml-auto h-6 w-6 text-emerald-400 flex-shrink-0" />
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground">Confidence</span>
          <span className="text-emerald-400">{pct}%</span>
        </div>
        <div className="confidence-bar">
          <div
            className="confidence-bar-fill"
            style={{ "--progress-width": `${pct}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Disposal method */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Disposal Method</span>
        <span className={`waste-category-badge ${disposalCfg.badgeClass} gap-1.5`}>
          <DisposalIcon className="h-3.5 w-3.5" />
          {disposalCfg.label}
        </span>
      </div>

      {/* Bin colour */}
      <div className="p-3 rounded-xl bg-white/5 border border-white/8 flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 shadow-sm" />
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Bin Colour</p>
          <p className="text-sm text-foreground/90">{bin_color}</p>
        </div>
      </div>
    </div>
  )
}

