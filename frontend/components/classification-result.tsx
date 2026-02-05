"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ClassificationResultProps {
  category: string
  disposal: string
  confidence: number
  bin_color: string
}

const categoryStyles: Record<string, { badge: string; icon: string }> = {
  plastic: { badge: "waste-category-plastic", icon: "🥤" },
  organic: { badge: "waste-category-organic", icon: "🍎" },
  metal: { badge: "waste-category-metal", icon: "🥫" },
  glass: { badge: "waste-category-glass", icon: "🍾" },
  paper: { badge: "waste-category-paper", icon: "📄" },
  landfill: { badge: "waste-category-landfill", icon: "⚠️" },
}

export default function ClassificationResult({
  category,
  disposal,
  confidence,
  bin_color,
}: ClassificationResultProps) {
  const style = categoryStyles[category.toLowerCase()] || categoryStyles.landfill
  const disposalColor =
    disposal === "Recyclable"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : disposal === "Compostable"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"

  return (
    <Card className="border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-3xl">{style.icon}</span>
          Classification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Waste Type</p>
            <p className="text-2xl font-bold text-emerald-700">{category}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Confidence</p>
            <p className="text-2xl font-bold text-emerald-600">{(confidence * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">Disposal Method</p>
          <div className={`inline-block px-4 py-2 rounded-full font-medium ${disposalColor}`}>{disposal}</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Bin Color</p>
          <p className="text-blue-800 dark:text-blue-200">{bin_color}</p>
        </div>
      </CardContent>
    </Card>
  )
}
