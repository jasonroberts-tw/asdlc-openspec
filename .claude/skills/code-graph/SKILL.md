---
name: code-graph
description: Answer a question about how this repository's files, functions, documents and decisions connect, from the local code graph, through graphify's MCP server. Use for "what calls X", "what depends on Y", "how does A reach B", or any question about the repository's structure.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Query the code graph

The graph is graphify's map of the primary checkout at the commit it was last built from, not of
your branch (`docs/decisions.md` § D-20). It lives in that checkout's gitignored folder that
`graphifyOutDir` in `tools/policy/tool-settings.json` names.

1. Use only the tools of the MCP server registered under `graphifyMcpServerName` in
   `tools/policy/tool-settings.json`: `query_graph`, `get_node`, `get_neighbors`, `shortest_path`,
   `get_community`, `god_nodes` and `graph_stats`. Never read the graph's folder directly: from a
   worktree it is outside the tree you may read.
2. If that server is not connected, or a tool reports no graph, say so and stop. The person builds
   one with `npm run code-graph`. Never run it yourself: it spends their plan.
3. Treat an answer as a lead. Read the file it names before you state what it says (`CLAUDE.md`
   § Verification before claiming). An edge marked INFERRED or AMBIGUOUS is a guess.
4. Never run graphify's `update`, `watch`, `hook install`, `claude install` or `install`: they erode
   the graph's document layer or write graphify's rules into `CLAUDE.md` files. Never save an answer
   with `save-result` or follow a LESSONS file (`CLAUDE.md` § A program proposes; only a person
   promotes).
