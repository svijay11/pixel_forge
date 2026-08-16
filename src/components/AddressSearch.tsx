import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { searchAddresses, type AddressSuggestion } from '@/lib/geocode'
import { cn } from '@/lib/utils'

type AddressSearchProps = {
  className?: string
}

export function AddressSearch({ className }: AddressSearchProps) {
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [matches, setMatches] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [box, setBox] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    const node = boxRef.current
    if (!open || !node) return
    const update = () => setBox(node.getBoundingClientRect())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, matches.length, loading])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setMatches([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const timer = window.setTimeout(() => {
      void searchAddresses(q)
        .then((results) => {
          if (!cancelled) setMatches(results)
        })
        .catch(() => {
          if (!cancelled) setMatches([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 220)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    setActiveIndex(0)
  }, [matches])

  function submit(address?: AddressSuggestion) {
    const value = address ? `${address.line1}, ${address.line2}` : query.trim()
    if (!value) return
    const params = new URLSearchParams({ q: value })
    if (address) {
      params.set('lat', String(address.lat))
      params.set('lng', String(address.lng))
    }
    console.log('address submit', { value, lat: address?.lat, lng: address?.lng })
    navigate(`/app/results?${params.toString()}`)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(matches.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      submit(matches[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const showList = open && query.trim().length >= 2

  return (
    <form
      className={cn('relative w-full', className)}
      onSubmit={(e) => {
        e.preventDefault()
        submit(matches[activeIndex])
      }}
    >
      <label htmlFor="home-address" className="sr-only">
        Home address
      </label>
      <div
        ref={boxRef}
        className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-[0_8px_30px_rgba(23,23,23,0.06)] focus-within:ring-2 focus-within:ring-sage"
      >
        <Plus className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          id="home-address"
          name="address"
          type="text"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            showList && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined
          }
          placeholder="Enter a California address"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 160)
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent font-sans text-[15px] text-ink outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Check this address"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-ink hover:brightness-[0.98] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      {showList && box
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              aria-label="Suggested addresses"
              style={{
                position: 'fixed',
                left: box.left,
                width: box.width,
                bottom: window.innerHeight - box.top + 8,
                zIndex: 9999,
              }}
              className="max-h-72 overflow-y-auto rounded-2xl border border-line bg-paper py-2 shadow-[0_16px_40px_rgba(23,23,23,0.12)]"
            >
              {loading && matches.length === 0 ? (
                <li className="px-4 py-3 font-sans text-sm text-muted-foreground">Searching…</li>
              ) : matches.length === 0 ? (
                <li className="px-4 py-3 font-sans text-sm text-muted-foreground">
                  No matching addresses
                </li>
              ) : (
                matches.map((address, index) => {
                  const active = index === activeIndex
                  return (
                    <li key={address.id} role="presentation">
                      <button
                        type="button"
                        id={`${listId}-${address.id}`}
                        role="option"
                        aria-selected={active}
                        className={cn(
                          'flex w-full flex-col items-start px-4 py-2.5 text-left',
                          active ? 'bg-sage/25' : 'hover:bg-muted',
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => submit(address)}
                      >
                        <span className="font-sans text-sm text-ink">{address.line1}</span>
                        <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {address.line2}
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>,
            document.body,
          )
        : null}
    </form>
  )
}
