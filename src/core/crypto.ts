// WebCrypto-only (browser + Node >= 20). AES-256-GCM.
// Encrypted file layout: 0x01 (format byte) || 12-byte random IV || ciphertext+tag. No AAD.

const FORMAT_BYTE = 0x01;
const IV_LEN = 12;
const KEY_BYTES = 32;

const subtle = () => globalThis.crypto.subtle;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** 32 random bytes, base64url without padding — the content key for a new bundle. */
export function generateKey(): string {
  return toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
}

export async function importKey(key: string): Promise<CryptoKey> {
  const raw = fromBase64Url(key);
  return subtle().importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptBytes(key: CryptoKey, plain: Uint8Array): Promise<Uint8Array> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LEN));
  const cipher = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plain as BufferSource),
  );
  const out = new Uint8Array(1 + IV_LEN + cipher.length);
  out[0] = FORMAT_BYTE;
  out.set(iv, 1);
  out.set(cipher, 1 + IV_LEN);
  return out;
}

/** Throws a human-readable Error on tamper or wrong key. */
export async function decryptBytes(key: CryptoKey, file: Uint8Array): Promise<Uint8Array> {
  const badKeyMessage = "This link's key doesn't open the songbook";
  if (file.length < 1 + IV_LEN || file[0] !== FORMAT_BYTE) {
    throw new Error(badKeyMessage);
  }
  const iv = file.slice(1, 1 + IV_LEN);
  const cipher = file.slice(1 + IV_LEN);
  try {
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher as BufferSource);
    return new Uint8Array(plain);
  } catch {
    throw new Error(badKeyMessage);
  }
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await subtle().digest('SHA-256', data as BufferSource);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
