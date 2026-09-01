function getSecretString(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL: JWT_SECRET or SESSION_SECRET must be configured.");
  }
  return secret;
}

// Convert a string to an array buffer
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert a buffer to a string
function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Get the cryptographic key for AES-GCM with robust SHA-256 key derivation (P0-2 fix)
async function getCryptoKey(): Promise<CryptoKey> {
  const secret = getSecretString();
  const secretBytes = stringToBuffer(secret);
  const keyBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", secretBytes as any));
  return await crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface SessionData {
  userId: string;
  username: string;
  role: string;
  createdAt: number;
}

export async function encryptSession(data: SessionData): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV is standard for AES-GCM
  const encodedData = stringToBuffer(JSON.stringify(data));
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as any },
    key,
    encodedData as any
  );

  // Convert to hex for cookie storage
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedHex = Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ivHex}:${encryptedHex}`;
}

export async function decryptSession(text: string): Promise<SessionData | null> {
  try {
    if (!text || !text.includes(":")) return null;
    const [ivHex, encryptedHex] = text.split(":");
    
    // Parse hex strings back to Uint8Arrays
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedData = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const key = await getCryptoKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as any },
      key,
      encryptedData as any
    );

    const session: SessionData = JSON.parse(bufferToString(decryptedBuffer));
    if (!session || typeof session.createdAt !== 'number') return null;

    // Verify session age (12 hours check, matching 12h policy)
    const isExpired = Date.now() - session.createdAt > 12 * 60 * 60 * 1000;
    if (isExpired) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}
