import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUp, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { STUB_ADDRESSES, type StubAddress } from '@/data/addresses'
import { TypingAnimation } from '@/components/ui/typing-animation'
import { cn } from '@/lib/utils'

type AddressSearchProps = {
  className?: string
}

export function AddressSearch({ className }: AddressSearchProps) {
  const navigate = useNavigate()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return STUB_ADDRESSES
    return STUB_ADDRESSES.filter((a) =>
      `${a.line1} ${a.line2}`.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => {
    setActiveIndex(0)
  }, [matches.length, query])

  function submit(address?: StubAddress) {
    const value = address ? `${address.line1}, ${address.line2}` : query.trim()
    if (!value) return
    console.log('address submit', value)
    navigate(`/app/results?q=${encodeURIComponent(value)}`)
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

  const showTyping = !query && !focused

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
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-[0_8px_30px_rgba(23,23,23,0.06)] focus-within:ring-2 focus-within:ring-sage">
        <Plus className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="relative min-w-0 flex-1">
          {showTyping && (
            <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden">
              <TypingAnimation
                words={[
                  'Ask Ember',
                  'Enter your home address',
                  '1428 Oak Crest Drive, Pacific Palisades',
                ]}
                loop
                typeSpeed={42}
                deleteSpeed={28}
                pauseDelay={1600}
                className="font-sans text-[15px] font-normal text-muted-foreground"
                startOnView={false}
              />
            </div>
          )}
          <input
            ref={inputRef}
            id="home-address"
            name="address"
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined
            }
            placeholder={focused ? 'Enter your home address' : ''}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setFocused(true)
              setOpen(true)
            }}
            onBlur={() => {
              setFocused(false)
              window.setTimeout(() => setOpen(false), 120)
            }}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent font-sans text-[15px] text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          aria-label="Check this address"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-sage text-ink hover:brightness-[0.98] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggested addresses"
          className="absolute inset-x-0 bottom-[calc(100%+10px)] z-20 overflow-hidden rounded-2xl border border-line bg-paper py-2 shadow-[0_16px_40px_rgba(23,23,23,0.1)]"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 font-sans text-sm text-muted-foreground">
              No matching addresses in this stub list
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
        </ul>
      )}
    </form>
  )
}
