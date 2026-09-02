import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ALPHABETICAL } from "../lib/countries";
import { filterCountries } from "../lib/search";
import type { Country } from "../lib/types";
import { useIsDesktop } from "../hooks/useMediaQuery";

type Props = {
  disabledCodes: string[];
  onSelect: (code: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
};

export default function CountryPicker({
  disabledCodes,
  onSelect,
  onOpenChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const struck = useMemo(() => new Set(disabledCodes), [disabledCodes]);
  const results = useMemo(() => filterCountries(query, ALPHABETICAL), [query]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Focus the search field as soon as the panel is up.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape anywhere, click outside, and body-scroll lock for the mobile sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    const prev = document.body.style.overflow;
    if (!isDesktop) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.body.style.overflow = prev;
    };
  }, [open, isDesktop]);

  // Keep the highlighted row on screen.
  useLayoutEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>("[data-active=true]");
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open, query]);

  // A round ending while the sheet is open should put it away.
  useEffect(() => {
    if (disabled && open) close();
  }, [disabled]);

  function pick(c: Country) {
    if (struck.has(c.code)) return;
    close();
    onSelect(c.code);
  }

  function moveTo(next: number) {
    if (!results.length) return;
    setActive(((next % results.length) + results.length) % results.length);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(active + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(active - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveTo(results.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[active];
      if (c) pick(c);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const listId = "country-listbox";

  const panelBody = (
    <>
      <div className="border-b border-edge/70 p-2.5">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            results[active] ? `opt-${results[active].code}` : undefined
          }
          placeholder="Type a country"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="field h-12 w-full px-3 placeholder:text-muted"
        />
      </div>

      <ul
        id={listId}
        ref={listRef}
        role="listbox"
        aria-label="All countries"
        className="no-scrollbar flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {results.map((c, i) => {
          const out = struck.has(c.code);
          return (
            <li
              key={c.code}
              id={`opt-${c.code}`}
              role="option"
              aria-selected={i === active}
              aria-disabled={out || undefined}
              data-active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(c)}
              className={[
                "relative flex min-h-[44px] items-center px-4 py-2.5 text-[15px] leading-snug transition-colors duration-150",
                out
                  ? "cursor-not-allowed text-muted line-through opacity-40"
                  : i === active
                    ? "cursor-pointer text-chalk"
                    : "cursor-pointer text-chalk/90",
              ].join(" ")}
              style={
                !out && i === active
                  ? {
                      background:
                        "linear-gradient(90deg, color-mix(in srgb, var(--iris) 22%, transparent), transparent 85%)",
                      boxShadow: "inset 2px 0 0 0 var(--iris)",
                    }
                  : undefined
              }
            >
              {c.name}
            </li>
          );
        })}

        {results.length === 0 && (
          <li className="px-4 py-5 text-[15px] text-muted">
            No country matches &ldquo;{query}&rdquo;
          </li>
        )}
      </ul>
    </>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "btn btn-ghost h-14 w-full items-center justify-between px-4 text-left text-[16px] text-muted",
          disabled ? "opacity-40" : "",
        ].join(" ")}
      >
        <span>Which country?</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
          style={{
            transform: open ? "rotate(180deg)" : undefined,
            transition: "transform 150ms",
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && isDesktop && (
          <motion.div
            key="dropdown"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="surface surface-lit absolute left-0 right-0 top-[calc(100%+8px)] z-40 flex max-h-[340px] flex-col overflow-hidden"
            style={{ boxShadow: "0 30px 70px -30px rgba(0,0,0,0.9)" }}
          >
            {panelBody}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && !isDesktop && (
          <>
            <motion.div
              key="scrim"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30"
              style={{ background: "rgba(5,6,11,0.45)", backdropFilter: "blur(2px)" }}
              aria-hidden="true"
            />
            <motion.div
              key="sheet"
              initial={reduce ? false : { y: "100%" }}
              animate={{ y: 0 }}
              exit={reduce ? { y: 0 } : { y: "100%" }}
              transition={{
                type: "tween",
                ease: [0.22, 1, 0.36, 1],
                duration: 0.28,
              }}
              className="surface surface-lit fixed inset-x-0 bottom-0 z-40 flex h-[60svh] flex-col overflow-hidden rounded-b-none"
              data-sheet="true"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="flex justify-center pt-2" aria-hidden="true">
                <div className="h-1 w-10 rounded-full bg-edge" />
              </div>
              {panelBody}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
