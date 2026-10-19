
import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptWbToken } from "@/lib/wbTokenCrypto";

export async function getUserWbToken(
  userId: number
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("wb_connections")
    .select(
      "token_encrypted, token_iv, token_auth_tag, status"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load WB connection:", error.message);
    throw new Error("Не удалось получить подключение Wildberries");
  }

  if (!data || data.status !== "connected") {
    return null;
  }

  return decryptWbToken({
    encrypted: data.token_encrypted,
    iv: data.token_iv,
    authTag: data.token_auth_tag,
  });
}
