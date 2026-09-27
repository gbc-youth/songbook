import type { LicenseSource } from '../core';

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB warn threshold

export const LICENSE_LABELS: Record<LicenseSource, string> = {
  'public-domain': 'Public domain',
  ccli: 'CCLI',
  onelicense: 'OneLicense',
  permission: 'Direct permission',
  original: 'Original (written in-house)',
  other: 'Other',
};

export const LICENSE_HINTS: Record<LicenseSource, string> = {
  'public-domain': 'No copyright restrictions — free to use, copy and share.',
  ccli: 'Covered by your CCLI Church Copyright License; add the CCLI song number below.',
  onelicense: 'Covered by your OneLicense agreement.',
  permission: 'Used with direct written permission from the copyright holder.',
  original: 'Written at your church; you hold the rights.',
  other: 'Some other arrangement — note the details in the copyright line.',
};

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export async function readFileAsBytes(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

export function extensionOf(filename: string): string {
  const m = /\.([^.]+)$/.exec(filename);
  return m ? m[1].toLowerCase() : '';
}

export function baseName(filename: string): string {
  return filename.replace(/\.[^./]+$/, '');
}

export function triggerDownload(bytes: Uint8Array, filename: string, mime: string): void {
  const blob = new Blob([bytes.slice()], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
