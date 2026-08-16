export type StatFormat = 'comma' | 'plain'

export type Stat = {
  id: string
  value: number
  suffix?: string
  format: StatFormat
  caption: string
  source: string
}

export const STATS: Stat[] = [
  {
    id: 'acres',
    value: 525223,
    format: 'comma',
    caption: 'ACRES BURNED, CA 2025',
    source: 'Cal Fire / NIFC',
  },
  {
    id: 'structures',
    value: 16512,
    format: 'comma',
    caption: 'STRUCTURES LOST, CA 2025',
    source: 'Cal Fire / NIFC',
  },
  {
    id: 'wui',
    value: 14,
    suffix: 'M',
    format: 'plain',
    caption: 'CALIFORNIANS LIVING IN THE WUI, ~1 IN 3',
    source: 'CalMatters analysis',
  },
  {
    id: 'evacuated',
    value: 200000,
    suffix: '+',
    format: 'comma',
    caption: 'EVACUATED, JAN 2025 LA FIRES ALONE',
    source: 'Cal Fire / news reporting',
  },
]
