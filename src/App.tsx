import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AuthSheet from "./components/AuthSheet";
import Background from "./components/Background";
import Cursor from "./components/Cursor";
import Header from "./components/Header";
import Leaderboard from "./components/Leaderboard";
import Home from "./components/Home";
import Results from "./components/Results";
import Round from "./components/Round";
import SyncStatus from "./components/SyncStatus";
import { useSyncStatus } from "./hooks/useSyncStatus";
import { BY_CODE } from "./lib/countries";
import { getDailyRounds } from "./lib/daily";
import { todayKey } from "./lib/date";
import { MAX_ATTEMPTS, finalScore, multiplierFor, pointsForAttempt } from "./lib/scoring";
import { computeStreak } from "./lib/streak";
import {
  emptyStore,
  lifetimePoints,
  loadStore,
  pendingDates,
  playedDates,
  writeDay,
  writeInProgress,
  type Store,
} from "./lib/storage";
import { supabase } from "./lib/supabase";
import { emitSync } from "./lib/syncBus";
import { fetchProfile } from "./lib/profile";
import { flushPending, pushDay, syncAll } from "./lib/sync";
import type { DayResult, InProgress, RoundResult } from "./lib/types";

type Screen = "home" | "playing" | "results" | "leaderboard";

type Game = {
  date: string;
  codes: string[];
  roundIndex: 0 | 1 | 2;
  phase: "guessing" | "revealed";
  wrongGuesses: string[][];
  results: RoundResult[];
};

const toInProgress = (g: Game): InProgress => ({
  date: g.date,
  roundIndex: g.roundIndex,
  phase: g.phase,
  wrongGuesses: g.wrongGuesses,
  results: g.results,
});

function freshGame(date: string): Game {
  return {
    date,
    codes: getDailyRounds(date),
    roundIndex: 0,
    phase: "guessing",
    wrongGuesses: [[], [], []],
    results: [],
  };
}

/** The rounds are never stored — only the index. They come back from the date
 *  seed, which is why the seeding has to be deterministic. */
function restore(ip: InProgress): Game {
  return {
    date: ip.date,
    codes: getDailyRounds(ip.date),
    roundIndex: ip.roundIndex,
    phase: ip.phase,
    wrongGuesses: [0, 1, 2].map((i) => ip.wrongGuesses?.[i] ?? []),
    results: ip.results ?? [],
  };
}

export default function App() {
  const reduce = useReducedMotion();
  const [today] = useState(todayKey);
  const [store, setStore] = useState<Store>(emptyStore);
  const [screen, setScreen] = useState<Screen>("home");
  const [game, setGame] = useState<Game | null>(null);
  const [booted, setBooted] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const gameRef = useRef<Game | null>(null);
  gameRef.current = game;
  const userRef = useRef<string | null>(null);
  userRef.current = userId;

  // --- boot -----------------------------------------------------------------
  useEffect(() => {
    // localStorage always, first, before anything touches the network.
    const s = loadStore();
    setStore(s);

    if (s.inProgress && s.inProgress.date === today) {
      setGame(restore(s.inProgress));
      setScreen("playing");
    } else if (s.inProgress) {
      writeInProgress(null); // stale day, discard silently
    }
    setBooted(true);
  }, [today]);

  // --- session --------------------------------------------------------------
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user;
      if (u) {
        setUserId(u.id);
        setEmail(u.email ?? null);
        syncAll(u.id).then(setStore);
        fetchProfile(u.id).then((p) => p && setUsername(p.username));
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // The whole retry mechanism: flush whenever the network comes back.
  useEffect(() => {
    const onOnline = () => {
      const id = userRef.current;
      if (id) flushPending(id).then(setStore);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Mobile browsers kill backgrounded tabs without warning.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && gameRef.current) {
        writeInProgress(toInProgress(gameRef.current));
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const dates = useMemo(() => playedDates(store), [store]);
  const playedToday = Boolean(store.days[today]);
  const streak = useMemo(() => computeStreak(dates, today), [dates, today]);
  const lifetime = useMemo(() => lifetimePoints(store), [store]);
  const todayCodes = useMemo(() => getDailyRounds(today), [today]);
  const pending = useMemo(() => pendingDates(store).length, [store]);

  const syncState = useSyncStatus({ pendingCount: pending, signedIn: Boolean(userId) });

  // --- actions --------------------------------------------------------------
  const startOrShow = useCallback(() => {
    if (playedToday) {
      setScreen("results");
      return;
    }
    const g = freshGame(today);
    setGame(g);
    writeInProgress(toInProgress(g));
    setScreen("playing");
  }, [playedToday, today]);

  const completeDay = useCallback((g: Game) => {
    const base = g.results.reduce((sum, r) => sum + r.points, 0);
    // Streak includes today.
    const withToday = [...playedDates(loadStore()), g.date];
    const s = computeStreak(withToday, g.date);
    const multiplier = multiplierFor(s);
    const day: DayResult = {
      date: g.date,
      rounds: g.results,
      base,
      multiplier,
      final: finalScore(base, multiplier),
    };

    // localStorage first, then the network. Never block the results screen.
    setStore(writeDay(day));
    setGame(null);
    setScreen("results");

    const id = userRef.current;
    if (id) pushDay(id, day).then(setStore);
    else emitSync("guest");
  }, []);

  const onGuess = useCallback((code: string) => {
    setGame((g) => {
      if (!g || g.phase !== "guessing") return g;
      const i = g.roundIndex;
      const answer = g.codes[i];
      const wrong = g.wrongGuesses[i];
      if (wrong.includes(code)) return g;

      let next: Game;
      if (code === answer) {
        const attempts = wrong.length + 1;
        next = {
          ...g,
          phase: "revealed",
          results: [
            ...g.results,
            { code: answer, attempts, points: pointsForAttempt(attempts), solved: true },
          ],
        };
      } else {
        const nextWrong = g.wrongGuesses.map((w, n) => (n === i ? [...w, code] : w));
        if (nextWrong[i].length >= MAX_ATTEMPTS) {
          next = {
            ...g,
            wrongGuesses: nextWrong,
            phase: "revealed",
            results: [
              ...g.results,
              { code: answer, attempts: MAX_ATTEMPTS, points: 0, solved: false },
            ],
          };
        } else {
          next = { ...g, wrongGuesses: nextWrong };
        }
      }
      // After every single guess, right or wrong, and on every phase change.
      writeInProgress(toInProgress(next));
      return next;
    });
  }, []);

  const onNext = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.phase !== "revealed") return;

    if (g.roundIndex >= 2) {
      completeDay(g);
      return;
    }
    const next: Game = {
      ...g,
      roundIndex: (g.roundIndex + 1) as 0 | 1 | 2,
      phase: "guessing",
    };
    writeInProgress(toInProgress(next));
    setGame(next);
  }, [completeDay]);

  const onSignedIn = useCallback((id: string) => {
    setUserId(id);
    // Five guest days followed by a sign-in stay a five-day streak.
    syncAll(id).then(setStore);
    fetchProfile(id).then((p) => p && setUsername(p.username));
  }, []);

  const onSignedOut = useCallback(() => {
    setUserId(null);
    setEmail(null);
    setUsername(null);
    setStore(loadStore()); // localStorage stays exactly as it is
  }, []);

  // --- render ---------------------------------------------------------------
  const todayResult = store.days[today] ?? null;

  // One key per distinct view, so a screen change cross-fades instead of
  // snapping. The round keys on its own index too, so each flag animates in.
  const viewKey =
    screen === "playing" && game ? `playing-${game.roundIndex}-${game.phase}` : screen;

  return (
    <div className="min-h-dvh px-5 pb-28">
      <Background />
      <Cursor />
      <div className="mx-auto w-full max-w-[560px]">
        <Header streak={streak} email={email} onAuth={() => setAuthOpen(true)} />

        <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={viewKey}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
        {!booted ? null : screen === "playing" && game ? (
          <Round
            country={BY_CODE[game.codes[game.roundIndex]]}
            roundIndex={game.roundIndex}
            total={game.codes.length}
            phase={game.phase}
            wrongGuesses={game.wrongGuesses[game.roundIndex]}
            result={game.results[game.roundIndex] ?? null}
            onGuess={onGuess}
            onNext={onNext}
          />
        ) : screen === "leaderboard" ? (
          <Leaderboard today={today} userId={userId} onHome={() => setScreen("home")} />
        ) : screen === "results" && todayResult ? (
          <Results
            day={todayResult}
            streak={streak}
            isGuest={!userId}
            onSignIn={() => setAuthOpen(true)}
            onHome={() => setScreen("home")}
            onLeaderboard={() => setScreen("leaderboard")}
          />
        ) : (
          <Home
            today={today}
            todayCodes={todayCodes}
            streak={streak}
            lifetime={lifetime}
            playedToday={playedToday}
            onPlay={startOrShow}
            onLeaderboard={() => setScreen("leaderboard")}
          />
        )}
        </motion.div>
        </AnimatePresence>
      </div>

      <AuthSheet
        open={authOpen}
        email={email}
        userId={userId}
        username={username}
        onClose={() => setAuthOpen(false)}
        onSignedIn={onSignedIn}
        onSignedOut={onSignedOut}
        onUsernameSaved={setUsername}
      />

      <SyncStatus state={syncState} />
    </div>
  );
}
