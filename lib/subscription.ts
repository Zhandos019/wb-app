
import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SubscriptionAccess = {
  allowed: boolean;
  status: string | null;
  endsAt: string | null;
  reason: "active" | "missing" | "expired" | "lookup_error";
};

export async function getSubscriptionAccess(
  userId: number
): Promise<SubscriptionAccess> {
  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("status, trial_ends_at, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Subscription lookup failed:", error.message);

      return {
        allowed: false,
        status: null,
        endsAt: null,
        reason: "lookup_error",
      };
    }

    if (!data) {
      return {
        allowed: false,
        status: null,
        endsAt: null,
        reason: "missing",
      };
    }

    const now = Date.now();

    if (data.status === "trialing") {
      const endsAt = data.trial_ends_at;
      const endTime = endsAt ? Date.parse(endsAt) : NaN;

      if (Number.isFinite(endTime) && endTime > now) {
        return {
          allowed: true,
          status: data.status,
          endsAt,
          reason: "active",
        };
      }

      return {
        allowed: false,
        status: data.status,
        endsAt,
        reason: "expired",
      };
    }

    if (data.status === "active") {
      const endsAt = data.current_period_end;
      const endTime = endsAt ? Date.parse(endsAt) : NaN;

      if (Number.isFinite(endTime) && endTime > now) {
        return {
          allowed: true,
          status: data.status,
          endsAt,
          reason: "active",
        };
      }

      return {
        allowed: false,
        status: data.status,
        endsAt,
        reason: "expired",
      };
    }

    return {
      allowed: false,
      status: data.status,
      endsAt: null,
      reason: "expired",
    };
  } catch (error) {
    console.error("Subscription check failed:", error);

    return {
      allowed: false,
      status: null,
      endsAt: null,
      reason: "lookup_error",
    };
  }
}
