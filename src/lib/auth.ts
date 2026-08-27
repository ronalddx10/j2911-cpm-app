import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

/**
 * Hashes a plaintext password using Node's native scrypt algorithm.
 * Returns the hash in salt:derivedKey format.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:derivedKey hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  const testHash = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}
