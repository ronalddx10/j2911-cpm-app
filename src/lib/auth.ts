import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a plaintext password using Node's native async scrypt algorithm.
 * Returns the hash in salt:derivedKey format.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored salt:derivedKey hash asynchronously without blocking the event loop.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  const testHashBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedHashBuf = Buffer.from(hash, "hex");
  if (testHashBuf.length !== storedHashBuf.length) {
    return false;
  }
  return timingSafeEqual(storedHashBuf, testHashBuf);
}
