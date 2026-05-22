import type { Audit } from "@/lib/schema";

const INDEX_KEY = "ytchop:audit-index";

function auditKey(videoId: string): string {
  return `ytchop:audit:${videoId}`;
}

export function saveAudit(audit: Audit): void {
  try {
    localStorage.setItem(auditKey(audit.id), JSON.stringify(audit));
    let index: string[] = [];
    try {
      index = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    } catch {
      index = [];
    }
    const filtered = index.filter((id) => id !== audit.id);
    localStorage.setItem(INDEX_KEY, JSON.stringify([audit.id, ...filtered]));
  } catch {
    // quota exceeded or private mode
  }
}

export function loadAudit(videoId: string): Audit | null {
  try {
    const raw = localStorage.getItem(auditKey(videoId));
    if (!raw) return null;
    return JSON.parse(raw) as Audit;
  } catch {
    return null;
  }
}

export function listAudits(): Audit[] {
  try {
    const index: string[] = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    const results: Audit[] = [];
    for (const id of index) {
      const audit = loadAudit(id);
      if (audit) results.push(audit);
    }
    return results;
  } catch {
    return [];
  }
}

export function deleteAudit(videoId: string): void {
  try {
    localStorage.removeItem(auditKey(videoId));
    let index: string[] = [];
    try {
      index = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    } catch {
      index = [];
    }
    localStorage.setItem(INDEX_KEY, JSON.stringify(index.filter((id) => id !== videoId)));
  } catch {
    // quota exceeded or private mode
  }
}

export function clearAllAudits(): void {
  try {
    const index: string[] = JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
    for (const id of index) {
      localStorage.removeItem(auditKey(id));
    }
    localStorage.removeItem(INDEX_KEY);
  } catch {
    // quota exceeded or private mode
  }
}
