/**
 * FNV-1a over the UTF-16 code units of a string, the checksum each workflow under `.claude/workflows/`
 * computes over what an agent copies, so a copy that is not verbatim is refused; a workflow cannot
 * import, so each keeps its own copy, and `scripts/workflows.selftest.mjs` holds this one to theirs by
 * running the grader on a workflow's own sealed output.
 */
export function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
