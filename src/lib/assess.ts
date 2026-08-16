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
  }>
  wind: { speed?: string | null; direction?: string | null }
  alerts: Array<{
    event: string
    headline?: string | null
    severity?: string | null
  }>
  address?: string | null
}

export async function assessAddress(
  input: {
    address: string
    lat: number
    lon: number
  },
  signal?: AbortSignal,
): Promise<AssessResponse> {
  const timeout = AbortSignal.timeout(90_000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  let res: Response
  try {
    res = await fetch('/api/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: combined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (signal?.aborted) throw err
      throw new Error('Assessment timed out. Try the address again.')
    }
    throw err
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return (await res.json()) as AssessResponse
}
