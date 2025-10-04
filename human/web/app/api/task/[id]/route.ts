import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const response = await fetch(`${API_URL}/human/${id}`, {
      headers: {
        Authorization: request.headers.get('Authorization') || '',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const action = body.action // 'respond', 'reject', 'delegate'

    let endpoint = ''
    if (action === 'respond') endpoint = `/human/${id}/respond`
    else if (action === 'reject') endpoint = `/human/${id}/reject`
    else if (action === 'delegate') endpoint = `/human/${id}/delegate`
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Request failed' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
