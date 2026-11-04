// Mirrors pipeline/slugify.py exactly -- must stay in lockstep so state/city/
// station ids computed here match the ids the pipeline used as filenames.
export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "unknown";
}
