import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:5000"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Send to Python backend for classification
    const pythonResponse = await fetch(`${PYTHON_SERVER_URL}/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    })

    if (!pythonResponse.ok) {
      // try to read the body for a helpful message
      let serviceText = ""
      try {
        serviceText = await pythonResponse.text()
      } catch (e) {
        serviceText = "(failed to read response body)"
      }
      console.error("Python service error:", pythonResponse.status, serviceText)
      return NextResponse.json(
        { error: "Classification service failed", details: serviceText },
        { status: 502 },
      )
    }

    const classificationResult = await pythonResponse.json()

    // Store in database
    // Validate expected fields from classifier
    const waste_category = classificationResult?.waste_category ?? null
    const disposal_type = classificationResult?.disposal_type ?? null
    const confidence = typeof classificationResult?.confidence === "number" ? classificationResult.confidence : null
    const tip = classificationResult?.tip ?? null

    const { error: dbError } = await supabase.from("waste_classifications").insert({
      user_id: user.id,
      image_url: typeof image === "string" ? image.substring(0, 100) : null,
      waste_category,
      disposal_type,
      confidence,
      tip,
    })

    if (dbError) {
      console.error("DB insert error:", dbError)
      return NextResponse.json({ error: "DB insert failed", details: dbError.message }, { status: 500 })
    }

    return NextResponse.json(classificationResult)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 },
    )
  }
}
