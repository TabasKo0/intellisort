import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:5000"

    const flaskResponse = await fetch(PYTHON_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!flaskResponse.ok) {
      return NextResponse.json(
        { error: `Backend responded with status: ${flaskResponse.status}` },
        { status: flaskResponse.status }
      );
    }

    const data = await flaskResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Connection to Flask server failed' },
      { status: 500 }
    );
  }
}