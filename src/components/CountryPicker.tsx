import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ALPHABETICAL } from "../lib/countries";
import { filterCountries } from "../lib/search";
import type { Country } from "../lib/types";
import { useIsDesktop } from "../hooks/useMediaQuery";
import { useKeyboardInset } from "../hooks/useKeyboardInset";

type Props = {
  disabledCodes: string[];
  onSelect: (code: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Pixels left beneath the flag, measured by the round. 0 = not measured yet. */
  roomBelowFlag?: number;
};

export default function CountryPicker({
  disabledCodes,
  onSelect,
  onOpenChange,
  disabled = false,
  roomBelowFlag = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion();
  const { inset: keyboard, height: viewport } = useKeyboardInset(open && !isDesktop);

  // With the keyboard up the sheet gets exactly the room left under the flag —
  // measured by the round, since the phone layout cannot scroll the flag out of
  // the way. Capped at 62% so that with the keyboard down, where the room is
  // most of the page, the sheet doesn't swallow the screen. Until the first
  // measurement lands (one frame) half the viewport is a close enough guess
  // that the correction is invisible under the slide-in.
  const room = roomBelowFlag || Math.round(viewport * 0.5);
  const sheetHeight = Math.round(Math.min(Math.max(room, 132), viewport * 0.62));

  // Keyboard up means every pixel counts: the drag handle is unusable anyway
  // while a keyboard owns the gesture area, so it and some padding step aside.
  const tight = keyboard > 0;

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
    if (open) inputRef.current?.focus({ preventScroll: true });
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
    // The attribute drives the chrome that folds away to make room for the
    // sheet (see index.css). Mobile only — desktop has height to spare.
    if (!isDesktop) {
      document.body.style.overflow = "hidden";
      document.documentElement.dataset.picker = "open";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.body.style.overflow = prev;
      delete document.documentElement.dataset.picker;
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
      <div className={`border-b border-edge/70 ${tight ? "p-2" : "p-2.5"}`}>
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
          placeholder="Start typing"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`field w-full px-3 placeholder:text-muted ${tight ? "h-11" : "h-12"}`}
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
                      background: "var(--hull)",
                      boxShadow: "inset 3px 0 0 0 var(--brass)",
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
        <span className="fell text-[18px]">Name the country</span>
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
            className="plank absolute left-0 right-0 top-[calc(100%+6px)] z-40 flex max-h-[340px] flex-col overflow-hidden"
            style={{ boxShadow: "0 30px 60px -28px rgba(0,0,0,0.95)" }}
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
              style={{ background: "rgba(8,6,5,0.28)" }}
              onClick={close}
              onTouchStart={close}
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
              className="plank fixed inset-x-0 z-40 flex flex-col overflow-hidden"
              data-sheet="true"
              style={{
                // ride above the keyboard instead of hiding beneath it
                bottom: keyboard,
                height: sheetHeight,
                paddingBottom: keyboard ? 0 : "env(safe-area-inset-bottom)",
              }}
            >
              {!tight && (
                <div className="flex justify-center pt-2" aria-hidden="true">
                  <div className="h-1 w-10 rounded-full bg-edge" />
                </div>
              )}
              {panelBody}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
