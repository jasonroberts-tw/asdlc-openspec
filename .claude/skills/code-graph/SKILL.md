---
name: code-graph
description: Answer a question about how this repository's files, functions, documents and decisions connect, from the local code graph, through the graphify MCP server's tools. Use for "what calls X", "what depends on Y", "how does A reach B", or any question about the repository's structure.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Query the code graph

The graph is graphify's map of the primary checkout at the commit it was last built from, not of
your branch (`docs/decisions.md` § D-20). It lives in that checkout's gitignored `graphify-out/`.

1. Use the `graphify` MCP server's tools only: `query_graph`, `get_node`, `get_neighbors`,
   `shortest_path`, `get_community`, `god_nodes` and `graph_stats`. Never read `graphify-out/`
   directly: from a worktree it is outside the tree you may read.
2. If no `graphify` server is connected, or a tool reports no graph, say so and stop. The person
   builds one with `npm run code-graph`. Never run it yourself: it spends their plan.
3. Treat an answer as a lead. Read the file it names before you state what it says (`CLAUDE.md`
   § Verification before claiming). An edge marked INFERRED or AMBIGUOUS is a guess.
4. Never run graphify's `update`, `watch`, `hook install`, `claude install` or `install`. The first
   three erode the graph's document layer; the last two write graphify's own rules, its advice to
   run `update` among them, into `CLAUDE.md` files. Never save an answer with `save-result` or
   follow a LESSONS file (`CLAUDE.md` § A program proposes; only a person promotes).
5. The server's pull-request tools are not this repository's pull-request route: that is the
   `open-pr` skill.
