// app/api/proxy/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();
    const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:5000"

    try {
        const flaskResponse = await fetch(`${PYTHON_SERVER_URL}/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await flaskResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Flask server unreachable' }, { status: 500 });
    }
}