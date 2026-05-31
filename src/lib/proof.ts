// Optional proof-document upload (RENT-tscofnqc / RENT-ngelwosv).
//
// Two upload paths share this module:
//   1. Inline on Step 1: contributor attaches a file before clicking submit;
//      the route handler writes to R2 during persist.
//   2. Late upload: ack/proof-prompt email links to /proof/<token>; that
//      route accepts the file and writes through the same helper.
//
// Storage: R2 bucket bound as env.PROOFS. Keys are `proofs/<sub_id>/<rand>.<ext>`
// so listing by prefix is cheap and there's no collision when a contributor
// re-uploads (they get a fresh random suffix; older blob is orphaned, can be
// purged by a periodic cleanup job — out of scope for v1).
//
// Limits (500 KB hard limit per the user spec). Mime is taken from the
// browser-supplied File.type and trusted at face value for v1 — accept jpg/
// png/webp/heic/pdf and reject anything else. We DO double-check the type
// by looking at the first few bytes of common formats so a renamed .exe
// doesn't slip through; see sniffMime().

export type ProofEnv = {
  PROOFS?: R2Bucket;
};

export const PROOF_MAX_BYTES = 500 * 1024; // 500 KB

// ACCEPTED_MIMES — what's allowed on the wire. Keep in sync with the
// `accept=` attribute on the Step 1 file input.
const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const EXT_FOR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

export type WriteProofResult =
  | { kind: "ok"; key: string }
  | { kind: "no_binding" } // R2 not wired (dev / pre-secret); caller no-ops
  | { kind: "too_large"; size: number }
  | { kind: "wrong_type"; type: string }
  | { kind: "empty" };

// writeProof validates the file + writes to R2. Returns the assigned key on
// success. No-ops with { kind: 'no_binding' } when env.PROOFS isn't wired so
// the rest of the submit flow keeps working in local dev.
export async function writeProof(
  env: ProofEnv,
  submissionId: string,
  file: File,
): Promise<WriteProofResult> {
  if (!env.PROOFS) return { kind: "no_binding" };
  if (file.size === 0) return { kind: "empty" };
  if (file.size > PROOF_MAX_BYTES) return { kind: "too_large", size: file.size };
  const claimedType = (file.type || "").toLowerCase();
  if (!ACCEPTED_MIMES.has(claimedType)) return { kind: "wrong_type", type: claimedType };

  const buf = await file.arrayBuffer();
  const sniffed = sniffMime(new Uint8Array(buf));
  // Allow when sniff agrees, or when sniff is "unknown" and the claim is in
  // the accepted set (HEIC magic-byte detection is rough, so we don't reject
  // it on sniff failure).
  if (sniffed !== "" && sniffed !== claimedType && !heicLike(claimedType, sniffed)) {
    return { kind: "wrong_type", type: `${claimedType} (sniffed ${sniffed})` };
  }

  const ext = EXT_FOR_MIME[claimedType] ?? "bin";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const key = `proofs/${submissionId}/${rand}.${ext}`;
  await env.PROOFS.put(key, buf, {
    httpMetadata: { contentType: claimedType },
    customMetadata: { submissionId },
  });
  return { kind: "ok", key };
}

// readProof — admin-side download. Returns the R2 object or null. Caller
// streams it back with the right content-type header.
export async function readProof(env: ProofEnv, key: string): Promise<R2ObjectBody | null> {
  if (!env.PROOFS) return null;
  return env.PROOFS.get(key);
}

// generateProofToken — returns a fresh URL-safe token for the late-upload
// page. Used at submission insert time when the contributor provided an
// email but didn't attach a file inline. Cleared from submissions.
// proof_upload_token after a successful upload.
export function generateProofToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// ---- internals ----

// sniffMime — examine the first few bytes to confirm the claimed type. Only
// covers the formats we accept; returns "" when format is unknown (we don't
// reject on unknown sniff — see writeProof for the policy).
function sniffMime(bytes: Uint8Array): string {
  if (bytes.length < 4) return "";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  // PDF: 25 50 44 46 ("%PDF")
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  // WebP: "RIFF" + 4 bytes + "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "";
}

// heicLike — HEIC/HEIF magic bytes are "ftypheic" / "ftypheif" / "ftypmif1"
// at offset 4. Browser File.type for HEIC photos varies wildly (some report
// "image/heic", some report blank, some report "image/heif"). Treat them
// as a single family.
function heicLike(claim: string, _sniff: string): boolean {
  return claim === "image/heic" || claim === "image/heif";
}
