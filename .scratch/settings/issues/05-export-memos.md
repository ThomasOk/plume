# 05: A user exports their memos as Markdown

**What to build:** In the Export section, a user clicks a button and downloads a zip of every memo they are the author of — not comments, never another author's memo — including those they wrote in spaces. Personal memos sit in `personal/`, space memos in one folder per space. Each memo is a Markdown file named by its creation date and first line, starting with YAML frontmatter (dates, visibility, tags, space name, attachment file names) followed by the content exactly as written. A user with no memos gets a valid, empty archive.

See spec: `.scratch/settings/spec.md` — "Export", user stories 34–44.

**Blocked by:** 01 (The settings page, and a user edits their name)

**Status:** ready-for-agent

- [ ] An archive builder in the api package takes the database and a user id and returns the zip's bytes, built in memory with `fflate`
- [ ] Folders: `personal/` and `spaces/<space-name-slug>/`; two spaces giving the same slug are told apart by a suffix
- [ ] File names: `YYYY-MM-DD` (UTC creation date), a dash, a slug of the first non-empty line (Markdown stripped, accents folded, lowercase, at most 50 characters, `memo` when empty), `.md`; collisions in a folder get `-2`, `-3`
- [ ] Frontmatter keys `created`, `updated` (RFC 3339), `visibility`, `tags`, `space` (space memos only), `attachments` (when any), written with a YAML serializer
- [ ] An authenticated `GET` route on the Hono server under the API prefix serves it with `Content-Disposition: attachment` and a dated file name, holding no logic of its own
- [ ] The Export section's button starts the download
- [ ] Integration test (archive builder on the test database, result unzipped): folder layout; file names and collision suffixes; frontmatter, including a tag or space name that needs quoting; content byte for byte; comments and other authors' memos excluded; empty archive for a user with no memos
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
