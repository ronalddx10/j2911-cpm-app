// Use the standard Web Cryptography API (crypto.subtle) which is supported in both Node.js and Next.js Edge Runtime.
const ENCRYPTION_KEY_STRING = process.env.SESSION_SECRET || process.env.JWT_SECRET || "itadakimasu_secure_jwt_secret_token_key_2026";

// Convert a string to an array buffer
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert a buffer to a string
function bufferToString(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

// Get the cryptographic key for AES-GCM
async function getCryptoKey(): Promise<CryptoKey> {
  const rawKey = stringToBuffer(ENCRYPTION_KEY_STRING.padEnd(32).slice(0, 32));
  return await crypto.subtle.importKey(
    "raw",
    rawKey as any,
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

    return JSON.parse(bufferToString(decryptedBuffer));
  } catch (error) {
    return null;
  }
}
