
import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const value = process.env.WB_TOKEN_ENCRYPTION_KEY;

  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(
      "WB_TOKEN_ENCRYPTION_KEY должен содержать 64 hex-символа"
    );
  }

  return Buffer.from(value, "hex");
}

export type EncryptedWbToken = {
  encrypted: string;
  iv: string;
  authTag: string;
};

export function encryptWbToken(token: string): EncryptedWbToken {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Токен Wildberries не может быть пустым");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(normalizedToken, "utf8"),
    cipher.final(),
  ]);

  return {
    encrypted: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

export function decryptWbToken(
  value: EncryptedWbToken
): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(value.iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(value.authTag, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(value.encrypted, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
