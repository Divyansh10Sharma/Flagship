import { supabase } from "./supabase";

export type Board = "today" | "points" | "streak";

export type Row = {
  userId: string;
  username: string;
  avatar: string | null;
  score: number;
  sub: string;
};

const LIMIT = 50;

/** Reads the security-definer views, so it works signed out too — a guest can
 *  see what they'd be joining. */
export async function fetchBoard(board: Board, today: string): Promise<Row[] | null> {
  if (!supabase) return null;

  if (board === "today") {
    const { data, error } = await supabase
      .from("daily_leaderboard")
      .select("user_id, username, avatar, base_score, multiplier, final_score")
      .eq("play_date", today)
      .order("final_score", { ascending: false })
      .limit(LIMIT);
    if (error) return null;
    return (data ?? []).map((r: any) => ({
      userId: r.user_id,
      username: r.username,
      avatar: r.avatar,
      score: r.final_score,
      sub: `${r.base_score} × ${Number(r.multiplier)}`,
    }));
  }

  const orderBy = board === "points" ? "total_points" : "current_streak";
  const { data, error } = await supabase
    .from("leaderboard")
    .select("user_id, username, avatar, total_points, days_played, current_streak, longest_streak")
    .order(orderBy, { ascending: false })
    .limit(LIMIT);
  if (error) return null;

  return (data ?? [])
    .filter((r: any) => r.days_played > 0)
    .map((r: any) => ({
      userId: r.user_id,
      username: r.username,
      avatar: r.avatar,
      score: board === "points" ? r.total_points : r.current_streak,
      sub:
        board === "points"
          ? `${r.days_played} day${r.days_played === 1 ? "" : "s"}`
          : `best ${r.longest_streak}`,
    }));
}
