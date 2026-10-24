import { logIgnored } from "./logIgnored";

// v357 (Ravi: "jo register karte hain wo pehle waitlist mein jaayein, approve ke baad hi Explore pe"):
// creator_profiles.profile_status defaults to "approved" in the database, and the (locked) POST /creators/profile
// creates a new creator's row without a status — so every sign-up looked approved. This guard runs in front of
// that route: when the creator has NO profile row yet, the row it creates is set to "under_review" right after the
// save. Nothing else of that route changes. Reading side: backend/exploreGate.ts approvedByAdmin.
export function setupCreatorReviewGate(router: any, deps: { supabase: any; privilegedSupabase: any; getDb: () => any; parseAuthUser: (req: any) => Promise<any> }) {
  const db = () => deps.privilegedSupabase || deps.supabase;

  router.post("/creators/profile", async (req: any, res: any, next: any) => {
    try {
      const user = await deps.parseAuthUser(req).catch(() => null);
      if (!user || String(user.role || "").toLowerCase() !== "creator" || !db()) return next();
      const { data: existing } = await db().from("creator_profiles").select("user_id").eq("user_id", user.user_id).maybeSingle();
      if (existing) return next();
      res.on("finish", () => {
        if (res.statusCode >= 400) return;
        markUnderReview(db(), deps.getDb, user.user_id).catch((e: any) => logIgnored("creatorReviewGate:finish", e));
      });
    } catch (e) { logIgnored("creatorReviewGate", e); }
    return next();
  });
}

/** A brand-new self-registered profile → "under_review" (never touches a profile an admin already reviewed). */
export async function markUnderReview(client: any, getDb: () => any, userId: string) {
  if (client) {
    await client.from("creator_profiles").update({ profile_status: "under_review" })
      .eq("user_id", userId).eq("profile_status", "approved").is("reviewed_at", null);
  }
  const local = getDb?.()?.creator_profiles;
  if (Array.isArray(local)) {
    const row = local.find((c: any) => String(c.user_id) === String(userId));
    if (row && row.profile_status === "approved" && !row.reviewed_at) row.profile_status = "under_review";
  }
}
