export type AddressSuggestion = {
  id: string
  line1: string
  line2: string
  lat?: number
  lng?: number
}

export const STUB_ADDRESSES: AddressSuggestion[] = [
  {
    id: 'palisades',
    line1: '1428 Oak Crest Drive',
    line2: 'Pacific Palisades, CA 90272',
  },
  {
    id: 'altadena',
    line1: '2147 Mariposa Street',
    line2: 'Altadena, CA 91001',
  },
  {
    id: 'berkeley',
    line1: '88 Canyon View Road',
    line2: 'Berkeley, CA 94708',
  },
  {
    id: 'mill-valley',
    line1: '3100 Redwood Highway',
    line2: 'Mill Valley, CA 94941',
  },
  {
    id: 'redding',
    line1: '1500 Shasta Bally Road',
    line2: 'Redding, CA 96001',
  },
]
