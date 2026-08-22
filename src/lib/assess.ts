import { apiUrl } from '@/lib/api'

export type ChecklistItem = {
  item: string
  why?: string | null
  focus?: string | null
  verified: boolean
}

export type BriefBeat = {
  title: string
  body: string
}

export type AssessResponse = {
  riskBrief: string
  headline?: string | null
  beats?: BriefBeat[]
  checklist: ChecklistItem[]
  hazardZone: string
  nearbyHotspots: Array<{
    lat: number
    lon: number
    miles?: number | null
    acq_date?: string | null
    satellite?: string | null
  }>
  nearbyIncidents: Array<{
    name: string
    county?: string | null
    acres?: number | null
    contained?: number | null
    miles?: number | null
    lat?: number | null
    lon?: number | null
    active?: boolean | null
  }>
  wind: { speed?: string | null; direction?: string | null }
  alerts: Array<{
    event: string
    headline?: string | null
    severity?: string | null
  }>
  address?: string | null
  threatRing?: 'immediate' | 'elevated' | null
  threatLabel?: string | null
}

export async function assessAddress(input: {
  address: string
  lat: number
  lon: number
}): Promise<AssessResponse> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 70_000)
  let res: Response
  try {
    res = await fetch(apiUrl('/api/assess'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Assessment timed out. Try the address again.')
    }
    throw err
  } finally {
    window.clearTimeout(timer)
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string' && body.detail.trim()) {
        detail = body.detail
      }
    } catch {
      if (res.status === 502 || res.status === 503) {
        detail = 'The assess server is not running. Start the backend and try again.'
      }
    }
    throw new Error(detail)
  }
  return (await res.json()) as AssessResponse
}
