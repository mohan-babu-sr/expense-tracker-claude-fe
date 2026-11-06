import { HttpResponse } from '@angular/common/http';

/** `attachment; filename="expenses_2026-11-01_2026-11-30.csv"` → `expenses_2026-11-01_2026-11-30.csv` */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Saves a Blob response as a file (design §4 "CSV"): create an object URL, click a temporary
 * <a download>, then release the URL. Works the same on laptop and phone browsers.
 */
export function saveBlobResponse(response: HttpResponse<Blob>, fallbackName: string): string {
  const name = fileNameFromDisposition(response.headers.get('Content-Disposition'), fallbackName);
  const url = URL.createObjectURL(response.body!);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the memory.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}
