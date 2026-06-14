import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const DEV_FALLBACK_SECRET = "sai-dev-fallback-key-change-in-production";

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** Secrets to try when decrypting (supports key rotation / env changes). */
function getDecryptionSecrets(): string[] {
  const secrets: string[] = [];

  if (process.env.SAI_ENCRYPTION_KEY) {
    secrets.push(process.env.SAI_ENCRYPTION_KEY);
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    secrets.push(process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  secrets.push(DEV_FALLBACK_SECRET);

  return [...new Set(secrets)];
}

/** Primary secret for new encryptions — prefer a stable dedicated key. */
function getPrimaryEncryptionSecret(): string {
  return (
    process.env.SAI_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    DEV_FALLBACK_SECRET
  );
}

function tryDecryptWithSecret(ciphertext: string, secret: string): string | null {
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  try {
    const key = deriveKey(secret);
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";

  const key = deriveKey(getPrimaryEncryptionSecret());
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return "";

  for (const secret of getDecryptionSecrets()) {
    const decrypted = tryDecryptWithSecret(ciphertext, secret);
    if (decrypted !== null) return decrypted;
  }

  return "";
}

export function maskSecret(_value: string): string {
  return "••••••••••••";
}
