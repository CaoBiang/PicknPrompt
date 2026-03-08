export function downloadBytes(filename: string, mimeType: string, bytes: Uint8Array | number[]) {
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
