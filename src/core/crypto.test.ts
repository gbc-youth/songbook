import { describe, expect, it } from 'vitest';
import { decryptBytes, encryptBytes, generateKey, importKey } from './crypto';

describe('crypto', () => {
  it('round-trips plaintext through encrypt/decrypt', async () => {
    const key = await importKey(generateKey());
    const plain = new TextEncoder().encode('Amazing grace, how sweet the sound');
    const encrypted = await encryptBytes(key, plain);

    expect(encrypted[0]).toBe(0x01);
    expect(encrypted.length).toBe(1 + 12 + plain.length + 16); // format byte + IV + ciphertext + 16-byte GCM tag

    const decrypted = await decryptBytes(key, encrypted);
    expect(new TextDecoder().decode(decrypted)).toBe('Amazing grace, how sweet the sound');
  });

  it('throws a human-readable error on tamper', async () => {
    const key = await importKey(generateKey());
    const encrypted = await encryptBytes(key, new TextEncoder().encode('hello'));
    encrypted[encrypted.length - 1] ^= 0xff; // flip a byte in the auth tag

    await expect(decryptBytes(key, encrypted)).rejects.toThrow("This link's key doesn't open the songbook");
  });

  it('throws a human-readable error for the wrong key', async () => {
    const keyA = await importKey(generateKey());
    const keyB = await importKey(generateKey());
    const encrypted = await encryptBytes(keyA, new TextEncoder().encode('hello'));

    await expect(decryptBytes(keyB, encrypted)).rejects.toThrow("This link's key doesn't open the songbook");
  });

  it('generateKey produces distinct base64url keys without padding', () => {
    const a = generateKey();
    const b = generateKey();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toContain('=');
  });
});
