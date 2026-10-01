# `.vale-styles/Layout/`

**This repository's own Vale style: three layout faults in prose, each at error level, so the
`vale@agent-tools` hook names one on the edit that makes it.** `.vale.ini` applies it to every
section that lints Markdown with a style. It is tracked although the rest of `.vale-styles/` is not:
`.gitignore` re-includes this directory, `vale sync` leaves it in place, and `scripts/new-worktree.sh`
copies a worktree only the synced styles it lacks. `npm run vale:selftest` holds each rule.

| File | What it refuses |
|---|---|
| `HeadingSpace.yml` | A heading with no blank line before it, outside front matter and fenced code. |
| `Rewrap.yml` | A line left more than one word past column 100 in a paragraph of more than one line; a backtick code span is one word, and a paragraph written as one line is never measured. The width is stated in this file alone. |
| `TrailingSpace.yml` | Whitespace at the end of a line, code included. |

Where a row here and the comment that opens its rule disagree, the rule's comment wins, and the row
is corrected.
