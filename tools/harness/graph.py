#!/usr/bin/env python3
"""
Harness assessment, the graph half. It reads the core's report (`tools/harness/harness.ts`), the
local code graph graphify built (`docs/decisions.md` § D-20) and the co-change map
(`docs/decisions.md` § D-24), and writes, beside the core's report, a report of its own; and, in
the file `graphifyCombinedGraphFile` in `tools/policy/tool-settings.json` names, one combined
graph: the graph, the wiring the harness declares and the co-change edges, in graphify's own id
space, recording the git blob id of the graph it was built from under the field
`graphifyCombinedGraphBlobField` names. Run from the checkout that holds the graph, with no
`--graph`, it writes that file beside the graph, where `scripts/code-graph.mjs` registers the MCP
server on it while that id is the graph beside it (`docs/decisions.md` § D-28); run from a linked
worktree, whose wiring and map are its branch's, or with `--graph`, it writes it beside its report,
not served. Why it is a half of its own is `docs/decisions.md` § D-26.

THE FAILURE IT EXISTS TO PREVENT. Measured on 2026-10-02 against the maintainer's graph built at
f862fe0, before this tool: the untracked script it replaces wrote its overlay with graphify's
`multigraph` false, and graphify's MCP loader keeps that flag, so an added edge between two nodes
that already shared one replaced it: 84 links lost, 12 of them imports, when the co-change map was
added that way. A co-change pair written once is invisible from one end to `graphify affected`,
which walks one direction. And the script reported every graph stale, taking package nodes such as
`js-yaml` for deleted files, while advising `graphify update`, which D-20 forbids. So this writer
checks its own output before it writes, and refuses a combined graph with `multigraph` false, a
co-change pair missing a direction, or a link to no node.

WHAT IT REPORTS, each item with a stable key and a level, as the core's are:

  - freshness (note): the graph's commit against HEAD and the map's baseline; files the graph holds
    that were tracked at its commit and are not now; harness files tracked now, of a type graphify
    extracts (`graphifySemanticExtensions` in `tools/policy/tool-settings.json` and the code
    extensions), that it lacks. A package node is not a file. `npm run code-graph` rebuilds the graph.
  - pairing (lead): the graph's `implements` edges from a script or tool to a rule section of the
    rules file. A language model drew them, and a rebuild draws others.
  - hidden (lead): two files that change together at or above the map's cluster index, neither a
    hub, with no edge of any relation between them in the graph.
  - loader (finding): where graphify can be imported, the combined graph loaded through its own
    MCP loader with fewer edges than were written. That loader is graphify's private
    `graphify.serve._load_graph`: a release that renames it turns the check into a skip, which says
    so, and moving `graphifyVersion` is the moment to check it.

A table, not findings: each cluster of the map against the graph's communities its files fall in.

INVOCATION.

  npm run harness:graph               after `npm run harness`, for the same date
  node scripts/python.mjs tools/harness/graph.py [--date YYYY-MM-DD] [--graph PATH]
  node scripts/python.mjs tools/harness/graph.py --selftest

`HARNESS_ROOT=<dir>` points it at a doctored copy. With no graph it says so and exits 0; with no
core report for the date it exits 1. Run it under graphify's own interpreter to have the loader
check run; under any other Python 3 that check says it is skipped.

NEEDS Python 3, standard library only; git; the core's report; the graph in the folder
`graphifyOutDir` in `tools/policy/tool-settings.json` names, under the primary checkout, where
`scripts/code-graph.mjs` builds it from whichever checkout runs it, so a worktree reads the same
graph. No network, and no language model: it reads a graph a person built.

KIND: assessment; writes its report under the core's report folder and the combined graph beside
  the graph or the report, never a committed artifact.
INVARIANTS: reads the graph and never writes it, refusing a combined graph's path that is the graph;
  every list sorted; the date is the run's argument.
RE-ENTRY: a second run with the same date and inputs writes the same bytes.
STALE WHEN: the graph is rebuilt, the core's report is rewritten, or the map's baseline moves.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

CONFIG = "tools/harness/harness.config.json"
PREAMBLE = ("describes", "whyThisFileExists", "gatedBy", "whatItDoesNOTDo", "provenance")
KEYS = ("reportDir", "cochangeMap", "graphOutDirPolicy", "cochangeRelation", "cochangeContext",
        "observedJaccardPolicy", "rulesFile", "pathRootsFrom", "codeExtensions", "hookJobs",
        "graphExtensionsPolicy", "promptPaths", "ciWorkflow", "otherWorkflows",
        "combinedGraphPolicy", "combinedGraphBlobPolicy", "packageManifest", "wiringContext")
OVERLAY = "harness-overlay"


class Refusal(Exception):
    """An input this half cannot read; the message opens with what is wrong."""


def default_root():
    env = os.environ.get("HARNESS_ROOT")
    return Path(env).resolve() if env else Path(__file__).resolve().parents[2]


def blob_id(data: bytes) -> str:
    """Git's blob id of the bytes, the id `git hash-object` gives the file."""
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def read_config(root: Path) -> dict:
    try:
        cfg = json.loads((root / CONFIG).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise Refusal(f"config: {CONFIG} cannot be read: {error}")
    problems = [f"`{k}` is missing" for k in PREAMBLE if not cfg.get(k)]
    for key in KEYS:
        if key not in cfg:
            problems.append(f"`{key}` is missing")
        if not cfg.get(f"{key}Means"):
            problems.append(f"`{key}Means` is missing")
    if problems:
        raise Refusal(f"config: {CONFIG}: {'; '.join(problems)}.")
    return cfg


def graph_root(root: Path, doctored: bool) -> Path:
    """Where the local graph lives: the primary checkout, which `scripts/code-graph.mjs` builds into
    from whichever checkout runs it (its `resolveRoot`), so a worktree finds the one graph; a
    doctored root, `HARNESS_ROOT`, holds its own."""
    if doctored:
        return root
    common = (git(root, "rev-parse", "--path-format=absolute", "--git-common-dir") or "").strip()
    return Path(common).parent if common else root


def path_roots(root: Path, cfg: dict) -> list:
    """The list of string literals the module constant `pathRootsFrom` names holds, read from its
    source as the core reads it, so the roots have one home."""
    ref = cfg["pathRootsFrom"]
    try:
        text = (root / ref["file"]).read_text(encoding="utf-8")
    except OSError:
        text = ""
    m = re.search(r"\bconst\s+" + re.escape(ref["constant"]) + r"\s*=\s*\[([^\]]*)\]", text)
    items = re.findall(r"""(['"])([^'"]+)\1""", m.group(1)) if m else []
    if not items:
        raise Refusal(f"input: `{ref['constant']}` in {ref['file']}, which {CONFIG} names, is not a list of string literals.")
    return [value for _, value in items]


def policy_value(root: Path, ref: dict):
    try:
        value = json.loads((root / ref["file"]).read_text(encoding="utf-8"))[ref["key"]]
    except (OSError, ValueError, KeyError) as error:
        raise Refusal(f"input: `{ref['key']}` in {ref['file']}, which {CONFIG} names, cannot be read: {error}")
    return value


def git(root: Path, *args, scratch=False):
    """git in `root` with no inherited `GIT_*` key; a scratch repository also reads no
    configuration of this machine's, as `SCRATCH_GIT_ENV` in `tools/lib/git-env.ts` does."""
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    if scratch:
        env.update(GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_SYSTEM=os.devnull)
    try:
        return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True,
                              check=True, env=env).stdout
    except (OSError, subprocess.CalledProcessError):
        return None


# ------------------------------------------------------------------------------------- the overlay


def line_of(node) -> int:
    m = re.match(r"L(\d+)", str(node.get("source_location") or ""))
    return int(m.group(1)) if m else 10 ** 9


RANK = {"document": 0, "code": 1, "concept": 2, "rationale": 3, "paper": 4}


def anchors_for(nodes: dict, paths) -> tuple:
    """One node per path: graphify's file node (its label the file's name), else the file's
    document node at the earliest line, else its earliest node of any type. A path the graph has no
    node for gets none here, and the caller adds one."""
    by_file = defaultdict(list)
    for node in nodes.values():
        if node.get("source_file"):
            by_file[node["source_file"]].append(node)
    anchor, how = {}, Counter()
    for path in sorted(set(paths)):
        candidates = by_file.get(path, [])
        named = sorted((n for n in candidates if n.get("label") == os.path.basename(path)), key=lambda n: n["id"])
        if named:
            anchor[path] = named[0]["id"]
            how["file node"] += 1
        elif candidates:
            best = min(candidates, key=lambda n: (RANK.get(n.get("file_type"), 9), line_of(n), n["id"]))
            anchor[path] = best["id"]
            how[f"{best.get('file_type')} node"] += 1
    return anchor, how


def combine(graph: dict, report: dict, cc: dict, cfg: dict, date: str, graph_blob: str, blob_field: str) -> dict:
    """The graph with the core's wiring and the map's co-change edges added, in graphify's ids,
    recording under `blob_field` the blob id of the graph it was built from, which
    `scripts/code-graph.mjs` holds the `graph.json` beside it to before it serves this file."""
    nodes = {n["id"]: dict(n) for n in graph["nodes"]}
    community = 1 + max((n["community"] for n in nodes.values() if isinstance(n.get("community"), int)), default=-1)
    wired_files = {w[side][5:] for w in report["wiring"] for side in ("from", "to") if w[side].startswith("file:")}
    cc_files = {f["path"] for f in cc["files"]}
    anchor, _ = anchors_for(nodes, wired_files | cc_files)

    def new_node(nid, label, file_type, source_file):
        base, n = nid, 2
        while nid in nodes:
            nid, n = f"{base}_{n}", n + 1
        nodes[nid] = {"id": nid, "label": label, "norm_label": label.lower(), "file_type": file_type,
                      "source_file": source_file, "_origin": OVERLAY, "community": community,
                      "community_name": "Harness overlay"}
        return nid

    for path in sorted((wired_files | cc_files) - set(anchor)):
        ext = os.path.splitext(path)[1]
        anchor[path] = new_node(f"harness_file_{slug(path)}", os.path.basename(path),
                                "code" if ext in cfg["codeExtensions"] else "document", path)
    for f in cc["files"]:
        node = nodes[anchor[f["path"]]]
        node["cochange_changes"], node["cochange_hub"] = f["changes"], f["hub"]

    ids = {}

    def endpoint(ref: str) -> str:
        if ref in ids:
            return ids[ref]
        kind, name = ref.split(":", 1)
        if kind == "file":
            ids[ref] = anchor[name]
        elif kind == "script":
            ids[ref] = new_node(f"package_scripts_{slug(name)}", name, "code", cfg["packageManifest"])
        else:
            ids[ref] = new_node(f"harness_job_{slug(name)}", f"job {name}", "concept", cfg["hookJobs"])
        return ids[ref]

    links = [dict(link) for link in graph["links"]]
    for wire in report["wiring"]:
        link = {"source": endpoint(wire["from"]), "target": endpoint(wire["to"]), "relation": wire["relation"],
                "context": cfg["wiringContext"], "confidence": "EXTRACTED", "confidence_score": 1, "weight": 1,
                "source_file": wire["declaredIn"], "_origin": OVERLAY}
        if wire.get("detail"):
            link["detail"] = wire["detail"]
        links.append(link)
    for edge in cc["edges"]:
        j = edge["jaccardPermille"]
        for a, b in ((edge["a"], edge["b"]), (edge["b"], edge["a"])):
            links.append({"source": anchor[a], "target": anchor[b], "relation": cfg["cochangeRelation"],
                          "context": cfg["cochangeContext"], "confidence": "EXTRACTED", "confidence_score": 1,
                          "weight": (j or 0) / 1000, "together": edge["together"], "jaccard_permille": j,
                          "source_file": cfg["cochangeMap"], "_origin": "cochange"})
    hyperedges = list(graph.get("hyperedges", []))
    for cluster in cc.get("clusters") or []:
        hyperedges.append({"id": f"cochange_cluster_{slug(cluster['id'])}",
                           "label": f"co-change cluster of {cluster['id']} ({len(cluster['files'])} files)",
                           "nodes": [anchor[p] for p in cluster["files"]], "relation": "co_change_cluster",
                           "confidence": "EXTRACTED", "confidence_score": 1, "source_file": cfg["cochangeMap"],
                           "_origin": "cochange"})
    meta = dict(graph.get("graph") or {})
    meta.update({"harness_overlay": date, "cochange_through": cc.get("throughCommit"), blob_field: graph_blob})
    out = {k: v for k, v in graph.items() if k not in ("nodes", "links", "hyperedges", "graph", "multigraph")}
    out.update({"multigraph": True, "graph": meta, "nodes": [nodes[k] for k in sorted(nodes)],
                "links": links, "hyperedges": hyperedges})
    return out


def verify_overlay(combined: dict, cc: dict, cfg: dict) -> list:
    """Why a combined graph must not be written, or nothing: graphify's loader keeps `multigraph`,
    and with it false a second edge between two nodes replaces the first; `graphify affected` walks
    one direction, so a pair needs both."""
    problems = []
    ids = {n["id"] for n in combined["nodes"]}
    if len(ids) != len(combined["nodes"]):
        problems.append("two nodes share an id")
    dangling = [l for l in combined["links"] if l["source"] not in ids or l["target"] not in ids]
    if dangling:
        problems.append(f"{len(dangling)} links name a node the graph lacks")
    pairs = Counter((l["source"], l["target"]) for l in combined["links"])
    if not combined.get("multigraph") and any(n > 1 for n in pairs.values()):
        problems.append("`multigraph` is false while two nodes share more than one link, so graphify's loader would keep one")
    rel = cfg["cochangeRelation"]
    directed = Counter((l["source"], l["target"]) for l in combined["links"] if l.get("relation") == rel)
    by_file = {}
    for node in combined["nodes"]:
        if "cochange_changes" in node:
            by_file[node["source_file"]] = node["id"]
    for edge in cc["edges"]:
        a, b = by_file.get(edge["a"]), by_file.get(edge["b"])
        if a is None or b is None or not directed[(a, b)] or not directed[(b, a)]:
            problems.append(f"the co-change pair {edge['a']} and {edge['b']} is not written in both directions")
    return problems


def loader_check(path: Path):
    """('ok'|'lost'|'skipped', detail): the combined graph through graphify's own MCP loader."""
    try:
        from graphify.serve import _load_graph  # graphify's interpreter only
    except Exception as error:  # noqa: BLE001 -- any import failure means no graphify here
        return "skipped", f"graphify cannot be imported by this interpreter ({type(error).__name__}); run under graphify's own Python to load the combined graph"
    data = json.loads(path.read_text(encoding="utf-8"))
    graph = _load_graph(str(path))
    lost = len(data["links"]) - graph.number_of_edges()
    return ("lost", lost) if lost > 0 else ("ok", graph.number_of_edges())


# ------------------------------------------------------------------------------------- the checks


def finding(check, level, subject, item, reason):
    return {"key": "|".join((check, subject, item)), "check": check, "level": level, "subject": subject,
            "item": item, "reason": reason}


def check_freshness(root: Path, graph: dict, cc: dict, cfg: dict, findings: list):
    built = graph.get("built_at_commit")
    head = (git(root, "rev-parse", "HEAD") or "").strip() or None
    through = cc.get("throughCommit")
    tracked = set((git(root, "ls-files") or "").split("\n")) - {""}
    sources = {n.get("source_file") for n in graph["nodes"] if n.get("source_file")}
    at_build = None
    if built:
        listed = git(root, "ls-tree", "-r", "--name-only", built)
        at_build = set(listed.split("\n")) - {""} if listed is not None else None
    # A package node's source is the package's name, never a tracked path, and a name such as
    # `decimal.js` looks like one; so a file is gone only if the graph's commit tracked it, and
    # with that commit unreadable here nothing is called gone.
    gone = sorted(s for s in sources if s in at_build and s not in tracked) if at_build is not None else []
    if at_build is None:
        findings.append(finding("freshness", "note", "graph", "unknown commit",
                                f"the graph's commit `{(built or 'none')[:12]}` cannot be read in this clone, so no file is reported gone; `git fetch` it, or rebuild the graph."))
    # The harness's files, from the config's own keys: the path roots, the prompts, the workflows'
    # folder; and only the types graphify extracts, so a data file it never gives a node, such as a
    # record under `tools/policy/` (`docs/decisions.md` § D-20), never reads as absent.
    workflows = [cfg["ciWorkflow"], *cfg["otherWorkflows"]]
    dirs = {f"{r}/" for r in path_roots(root, cfg)} | {f"{os.path.dirname(w)}/" for w in workflows if os.path.dirname(w)}
    files = set(workflows)
    for p in cfg["promptPaths"]:
        (files.add(p) if os.path.splitext(p)[1] else dirs.add(f"{p.rstrip('/')}/"))
    exts = tuple(cfg["codeExtensions"]) + tuple(policy_value(root, cfg["graphExtensionsPolicy"]))
    absent = sorted(f for f in tracked if (f in files or f.startswith(tuple(dirs))) and f.endswith(exts) and f not in sources)
    short = lambda c: (c or "none")[:12]
    stale = built != head or bool(gone) or bool(absent)
    state = "is stale" if stale else "is current"
    findings.append(finding("freshness", "note", "graph", "commit",
                            f"built at `{short(built)}`, HEAD is `{short(head)}`, the map is through `{short(through)}`; the graph {state}"
                            + ("; `npm run code-graph` rebuilds it, and `-- --code-only` calls no model." if stale else ".")))
    for path in gone:
        findings.append(finding("freshness", "note", "gone", path, "the graph holds it, tracked at the graph's commit and not now."))
    for path in absent:
        findings.append(finding("freshness", "note", "absent", path, "tracked now, and the graph has no node for it."))
    return {"built": built, "head": head, "through": through, "gone": len(gone), "absent": len(absent)}


def check_pairing(root: Path, graph: dict, cfg: dict, findings: list):
    nodes = {n["id"]: n for n in graph["nodes"]}
    roots = tuple(f"{r}/" for r in path_roots(root, cfg))
    for link in graph["links"]:
        if link.get("relation") != "implements":
            continue
        for a, b in ((link["source"], link["target"]), (link["target"], link["source"])):
            na, nb = nodes.get(a, {}), nodes.get(b, {})
            if (na.get("source_file") or "").startswith(roots) and nb.get("source_file") == cfg["rulesFile"]:
                findings.append(finding("pairing", "lead", na["source_file"], nb.get("label", b),
                                        f"the graph draws `implements` ({link.get('confidence', '?')}), which a language model made; read the file before citing it."))


def check_hidden(graph: dict, cc: dict, threshold: int, findings: list):
    nodes = {n["id"]: n for n in graph["nodes"]}
    files = defaultdict(set)
    for link in graph["links"]:
        a = nodes.get(link["source"], {}).get("source_file")
        b = nodes.get(link["target"], {}).get("source_file")
        if a and b and a != b:
            files[a].add(b)
            files[b].add(a)
    present = {n.get("source_file") for n in graph["nodes"]}
    hubs = {f["path"] for f in cc["files"] if f["hub"]}
    for edge in cc["edges"]:
        a, b, j = edge["a"], edge["b"], edge["jaccardPermille"] or 0
        if j < threshold or a in hubs or b in hubs or a not in present or b not in present:
            continue
        if b not in files[a]:
            findings.append(finding("hidden", "lead", a, b,
                                    f"changed together in {edge['together']} counted pull requests (Jaccard {j}/1000), and the graph has no edge between them."))


def cluster_table(graph: dict, cc: dict) -> list:
    nodes = {n["id"]: n for n in graph["nodes"]}
    anchor, _ = anchors_for(nodes, [p for c in cc.get("clusters") or [] for p in c["files"]])
    rows = []
    for cluster in cc.get("clusters") or []:
        tally = Counter()
        for path in cluster["files"]:
            node = nodes.get(anchor.get(path, ""), {})
            tally[str(node.get("community_name") or node.get("community", "none"))] += 1
        rows.append({"cluster": cluster["id"], "files": len(cluster["files"]),
                     "communities": [{"community": k, "files": v} for k, v in sorted(tally.items(), key=lambda kv: (-kv[1], kv[0]))]})
    return rows


# ------------------------------------------------------------------------------------- the run


LIMITS = {
    "freshness": "The graph's commit, HEAD and the map's baseline, and the files tracked at the graph's commit. A file renamed since the build reads as one gone and one absent.",
    "pairing": "Only the graph's `implements` edges, which a language model drew; the core's table of `§` citations is the deterministic one.",
    "hidden": "Any edge of any relation between two files' nodes counts as structure, a model-drawn one included, so a pair with only a guessed edge is not reported.",
    "loader": "Only where graphify can be imported; elsewhere the writer's own check, that `multigraph` is true and each pair runs both ways, stands in for it.",
}

BANNER = [
    "Written by `npm run harness:graph` (tools/harness/graph.py): a local assessment, never committed. Each item has a stable key and a level: finding, lead or note.",
    "The combined graph, read.combined, is the local graph with the harness's wiring and the co-change edges added. Where read.served is true it is written beside that graph, and `npm run code-graph:mcp` serves it while it records the graph beside it (docs/decisions.md § D-28); otherwise it is beside this report and not served.",
]


def serialise(report: dict) -> str:
    one_line = {"findings", "clusters"}

    def render(value, key, indent):
        if isinstance(value, list) and value and key in one_line:
            inner = ",\n".join(f"{indent}  {json.dumps(v, ensure_ascii=False, sort_keys=True)}" for v in value)
            return f"[\n{inner}\n{indent}]"
        if isinstance(value, dict) and value:
            inner = ",\n".join(f"{indent}  {json.dumps(k)}: {render(v, k, indent + '  ')}" for k, v in value.items())
            return f"{{\n{inner}\n{indent}}}"
        return json.dumps(value, ensure_ascii=False)

    return render(report, "", "") + "\n"


def markdown(report: dict) -> str:
    out = [f"# Harness assessment, the graph half, {report['date']}", ""]
    r = report["read"]
    out += [f"Written by `npm run harness:graph`. Script blob `{r['script'][:12]}`, graph blob `{r['graph'][:12]}` built at `{(r['graphBuiltAt'] or 'unknown')[:12]}`, core report of {report['date']}.", ""]
    s = report["summary"]
    out += [f"{s['findings']} findings, {s['leads']} leads, {s['notes']} notes. Combined graph: {s['nodes']} nodes, {s['links']} links, of which {s['cochangeLinks']} co-change and {s['wiringLinks']} wiring. Loader: {report['loader']['status']} ({report['loader']['detail']}).", ""]
    out += [f"The combined graph is `{r['combined']}`; " + ("`npm run code-graph:mcp` serves it while it records the graph beside it." if r["served"] else "it is beside the report and not served: run from the checkout that holds the graph, with no `--graph`, to serve it."), ""]
    c = report["comparison"]
    out += ["## Compared with the last report", ""]
    if c["previous"] is None:
        out += ["No earlier report.", ""]
    else:
        out += [f"Against {c['previous']}: {len(c['appeared'])} appeared, {len(c['went'])} went. The script {'changed' if c['scriptChanged'] else 'did not change'}.", ""]
        out += [f"- appeared: `{k}`" for k in c["appeared"]] + [f"- went: `{k}`" for k in c["went"]] + [""]
    for check, title in (("freshness", "Freshness"), ("loader", "Loading the combined graph"), ("hidden", "Co-change with no graph edge"), ("pairing", "Rule sections the graph says a script implements")):
        mine = [f for f in report["findings"] if f["check"] == check]
        out += [f"## {title}", ""]
        if not mine:
            out += ["Nothing.", ""]
            continue
        # The freshness verdict first, whatever its key sorts as, then twenty of the files it lists.
        shown = mine if check != "freshness" else [f for f in mine if f["subject"] == "graph"] + [f for f in mine if f["subject"] != "graph"][:20]
        out += [f"- **{f['level']}** `{f['subject']}`: `{f['item']}`: {f['reason']}" for f in shown]
        if len(shown) < len(mine):
            out += [f"- and {len(mine) - len(shown)} more in the JSON"]
        out += [""]
    out += ["## The map's clusters against the graph's communities", ""]
    for row in report["tables"]["clusters"]:
        out += [f"- `{row['cluster']}` ({row['files']} files): " + ", ".join(f"{x['community']} ×{x['files']}" for x in row["communities"])]
    out += ["", "## What each check cannot see", ""] + [f"- `{k}`: {v}" for k, v in report["limits"].items()] + [""]
    return "\n".join(out)


def latest_before(directory: Path, date: str):
    runs = sorted(p for p in directory.glob("*/graph-report.json") if p.parent.name < date)
    return json.loads(runs[-1].read_text(encoding="utf-8")) if runs else None


def run(root: Path, date: str, graph_path=None, out=None) -> tuple:
    """Assess, write the three files and return (report, folder); (None, reason) with no graph."""
    cfg = read_config(root)
    base = Path(out) if out else root / cfg["reportDir"]
    core_path = base / date / "harness.json"
    if not core_path.exists():
        raise Refusal(f"input: no core report at {core_path}; `npm run harness` writes it for the same date first.")
    # The combined graph is served only from beside the default graph, written by a run from the
    # checkout that holds it: a run from a linked worktree reads its own branch's wiring and map, and
    # beside the primary checkout's graph it would serve that branch to every session.
    groot = graph_root(root, bool(os.environ.get("HARNESS_ROOT")))
    serves = not graph_path and groot.resolve() == root.resolve()
    if not graph_path:
        graph_path = groot / policy_value(root, cfg["graphOutDirPolicy"]) / "graph.json"
    graph_path = Path(graph_path)
    if not graph_path.exists():
        return None, f"no graph at {graph_path}, so nothing to read; `npm run code-graph` builds one (`docs/decisions.md` § D-20)."
    graph_bytes = graph_path.read_bytes()
    graph = json.loads(graph_bytes)
    report_core = json.loads(core_path.read_text(encoding="utf-8"))
    cc_path = root / cfg["cochangeMap"]
    cc = json.loads(cc_path.read_text(encoding="utf-8")) if cc_path.exists() else {"files": [], "edges": [], "clusters": None}
    combined = combine(graph, report_core, cc, cfg, date, blob_id(graph_bytes), policy_value(root, cfg["combinedGraphBlobPolicy"]))
    problems = verify_overlay(combined, cc, cfg)
    if problems:
        raise Refusal("overlay: refusing to write the combined graph: " + "; ".join(problems) + ".")
    folder = base / date
    folder.mkdir(parents=True, exist_ok=True)
    # Beside the graph it combines, where `scripts/code-graph.mjs` serves it while it records that
    # graph; beside the report when this run may not serve it.
    name = policy_value(root, cfg["combinedGraphPolicy"])
    combined_path = (graph_path.parent if serves else folder) / name
    if combined_path.resolve() == graph_path.resolve():
        raise Refusal(f"input: {graph_path} is where the combined graph would be written; name the graph itself with --graph.")
    combined_path.write_text(json.dumps(combined, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    findings = []
    check_freshness(root, graph, cc, cfg, findings)
    check_pairing(root, graph, cfg, findings)
    if cc["edges"]:
        check_hidden(graph, cc, int(policy_value(root, cfg["observedJaccardPolicy"])), findings)
    status, detail = loader_check(combined_path)
    if status == "lost":
        findings.append(finding("loader", "finding", combined_path.name, "edges",
                                f"graphify's loader kept {detail} fewer edges than were written."))
    findings = sorted({f["key"]: f for f in findings}.values(), key=lambda f: f["key"])
    previous = latest_before(base, date)
    # Every item, notes included, as the core compares.
    keyed = lambda rep: {f["key"] for f in (rep or {}).get("findings", [])}
    now, before = keyed({"findings": findings}), keyed(previous)
    script_blob = blob_id(Path(__file__).read_bytes())
    links = combined["links"]
    report = {
        "_": BANNER,
        "date": date,
        "read": {"script": script_blob, "config": blob_id((root / CONFIG).read_bytes()), "graph": blob_id(graph_bytes),
                 "graphBuiltAt": graph.get("built_at_commit"), "core": blob_id(core_path.read_bytes()),
                 "cochangeThrough": cc.get("throughCommit"), "combined": str(combined_path), "served": serves},
        "limits": LIMITS,
        "summary": {"findings": sum(f["level"] == "finding" for f in findings), "leads": sum(f["level"] == "lead" for f in findings),
                    "notes": sum(f["level"] == "note" for f in findings), "nodes": len(combined["nodes"]), "links": len(links),
                    "cochangeLinks": sum(l.get("_origin") == "cochange" for l in links),
                    "wiringLinks": sum(l.get("_origin") == OVERLAY for l in links)},
        "loader": {"status": status, "detail": str(detail)},
        "findings": findings,
        "tables": {"clusters": cluster_table(graph, cc)},
        "comparison": {"previous": (previous or {}).get("date"), "appeared": sorted(now - before), "went": sorted(before - now),
                       "scriptChanged": None if previous is None else previous["read"]["script"] != script_blob},
    }
    (folder / "graph-report.json").write_text(serialise(report), encoding="utf-8")
    (folder / "graph-report.md").write_text(markdown(report), encoding="utf-8")
    return report, folder


# ------------------------------------------------------------------------------------- selftest


def selftest() -> int:
    """The half over a fixture repository and graph it builds under the temporary directory, beside
    an undoctored control, each check asserting the reason it reports."""
    live = default_root()
    failures, passed = [], 0

    def check(name, ok, detail=""):
        nonlocal passed
        if ok:
            passed += 1
        else:
            failures.append(f"{name}: {detail}")

    tmp = Path(tempfile.mkdtemp(prefix="harness-graph-"))
    try:
        root = tmp / "repo"
        (root / "tools/harness").mkdir(parents=True)
        fixture_cfg = json.loads((live / CONFIG).read_text(encoding="utf-8"))
        # Not the live value, so a context the code spells itself fails the check that reads this one.
        fixture_cfg["wiringContext"] = "declared"
        fixture_cfg_text = json.dumps(fixture_cfg)
        (root / CONFIG).write_text(fixture_cfg_text, encoding="utf-8")
        cfg = read_config(root)
        # Each value the config names, written to the file and key it names. The blob field is not
        # the live one, so a field the code spells itself fails the checks that read this one.
        blob_field = "fixture_graph_blob"
        records = defaultdict(dict)
        for name, value in (("observedJaccardPolicy", 400), ("cochangeSamplePolicy", 5), ("graphOutDirPolicy", "graph-out"),
                            ("graphExtensionsPolicy", [".md", ".yml", ".yaml"]), ("combinedGraphPolicy", "combined.json"),
                            ("combinedGraphBlobPolicy", blob_field)):
            records[cfg[name]["file"]][cfg[name]["key"]] = value
        for path, record in records.items():
            (root / path).parent.mkdir(parents=True, exist_ok=True)
            (root / path).write_text(json.dumps(record), encoding="utf-8")
        files = {"scripts/a.mjs": "import './b.mjs'\n", "scripts/b.mjs": "export const b = 1\n",
                 "scripts/c.mjs": "export const c = 1\n", "docs/hub.md": "# Hub\n",
                 cfg["pathRootsFrom"]["file"]: f"const {cfg['pathRootsFrom']['constant']} = ['tools', 'scripts', 'apps']\n",
                 "scripts/deleted.mjs": "export const d = 1\n", "docs/doc.md": "# Doc\n", "notes/new.md": "# New\n",
                 "package.json": "{}\n", cfg["hookJobs"]: "pre-push:\n  jobs: []\n"}
        for path, body in files.items():
            (root / path).parent.mkdir(parents=True, exist_ok=True)
            (root / path).write_text(body, encoding="utf-8")
        who = ("-c", "user.name=t", "-c", "user.email=t@example.invalid")
        env_git = lambda *a: git(root, *who, *a, scratch=True)
        env_git("init", "-q")
        env_git("add", "-A")
        env_git("commit", "-qm", "one")
        built = (env_git("rev-parse", "HEAD") or "").strip()
        env_git("rm", "-q", "scripts/deleted.mjs")
        env_git("commit", "-qm", "two")
        check("fixture: the repository has two commits", bool(built) and (env_git("rev-parse", "HEAD") or "").strip() != built, "git did not commit")
        graph = {
            "directed": False, "multigraph": False, "built_at_commit": built, "graph": {}, "hyperedges": [],
            "nodes": [
                {"id": "scripts_a", "label": "a.mjs", "source_file": "scripts/a.mjs", "file_type": "code", "community": 0, "source_location": "L1"},
                {"id": "a_header", "label": "The header of a", "source_file": "scripts/a.mjs", "file_type": "document", "community": 0, "source_location": "L1"},
                {"id": "scripts_c", "label": "c.mjs", "source_file": "scripts/c.mjs", "file_type": "code", "community": 1, "source_location": "L1"},
                {"id": "hub_md", "label": "hub.md", "source_file": "docs/hub.md", "file_type": "document", "community": 2, "source_location": "L1"},
                {"id": "scripts_b", "label": "b.mjs", "source_file": "scripts/b.mjs", "file_type": "code", "community": 1, "source_location": "L1"},
                {"id": "scripts_deleted", "label": "deleted.mjs", "source_file": "scripts/deleted.mjs", "file_type": "code", "community": 1},
                {"id": "doc_rule", "label": "A rule", "source_file": "docs/doc.md", "file_type": "concept", "community": 2, "source_location": "L3"},
                {"id": "doc_title", "label": "The doc", "source_file": "docs/doc.md", "file_type": "document", "community": 2, "source_location": "L1"},
                {"id": "js_yaml", "label": "js-yaml", "source_file": "js-yaml", "file_type": "code", "community": 3},
                {"id": "rule_x", "label": "Rule X", "source_file": cfg["rulesFile"], "file_type": "document", "community": 4},
            ],
            "links": [
                {"source": "scripts_a", "target": "scripts_b", "relation": "imports_from", "confidence": "EXTRACTED", "source_file": "scripts/a.mjs"},
                {"source": "scripts_b", "target": "rule_x", "relation": "implements", "confidence": "INFERRED", "source_file": "scripts/b.mjs"},
            ],
        }
        (root / "graph-out").mkdir()
        (root / "graph-out/graph.json").write_text(json.dumps(graph), encoding="utf-8")
        cc = {"throughCommit": built, "counted": 9,
              "files": [{"path": "scripts/a.mjs", "changes": 5, "hub": False}, {"path": "scripts/b.mjs", "changes": 5, "hub": False},
                        {"path": "docs/doc.md", "changes": 4, "hub": False}, {"path": "notes/new.md", "changes": 3, "hub": False},
                        {"path": "scripts/c.mjs", "changes": 4, "hub": False}, {"path": "docs/hub.md", "changes": 8, "hub": True}],
              "edges": [{"a": "docs/doc.md", "b": "scripts/a.mjs", "together": 3, "jaccardPermille": 500},
                        {"a": "notes/new.md", "b": "scripts/b.mjs", "together": 3, "jaccardPermille": 600},
                        {"a": "scripts/a.mjs", "b": "scripts/b.mjs", "together": 5, "jaccardPermille": 1000},
                        {"a": "scripts/b.mjs", "b": "scripts/c.mjs", "together": 2, "jaccardPermille": 286},
                        {"a": "docs/hub.md", "b": "scripts/c.mjs", "together": 4, "jaccardPermille": 500}],
              "clusters": [{"id": "scripts/a.mjs", "files": ["scripts/a.mjs", "scripts/b.mjs"]}]}
        (root / cfg["cochangeMap"]).parent.mkdir(parents=True, exist_ok=True)
        (root / cfg["cochangeMap"]).write_text(json.dumps(cc), encoding="utf-8")
        core = {"date": "2026-01-02", "findings": [], "wiring": [
            {"from": "script:check", "to": "file:scripts/a.mjs", "relation": "invokes", "declaredIn": "package.json"},
            {"from": "job:pre-push/check", "to": "script:check", "relation": "runs", "declaredIn": cfg["hookJobs"]},
            {"from": "job:pre-push/check", "to": "file:scripts/a.mjs", "relation": "declares_input", "declaredIn": cfg["hookJobs"], "detail": "scripts/**"}]}
        out = tmp / "out"
        (out / "2026-01-02").mkdir(parents=True)
        (out / "2026-01-02/harness.json").write_text(json.dumps(core), encoding="utf-8")

        # The control.
        report, folder = run(root, "2026-01-02", out=out)
        combined_path = root / "graph-out" / "combined.json"
        check("control: the combined graph is written beside the graph, under the policy's name, and not beside the report",
              combined_path.exists() and Path(report["read"]["combined"]).resolve() == combined_path.resolve() and not (folder / "combined.json").exists(),
              report["read"]["combined"])
        combined = json.loads(combined_path.read_text(encoding="utf-8"))
        check("control: the combined graph records the blob id of the graph it was built from",
              combined["graph"].get(blob_field) == blob_id((root / "graph-out/graph.json").read_bytes()), combined["graph"])
        hashed = (git(root, "hash-object", "--no-filters", str(root / "graph-out/graph.json"), scratch=True) or "").strip()
        check("control: that id is git's, as `scripts/code-graph.mjs` computes it", hashed != "" and combined["graph"].get(blob_field) == hashed, hashed)
        check("control: the report says the combined graph is served", report["read"]["served"] is True, report["read"])
        nodes = {n["id"]: n for n in combined["nodes"]}
        co = [l for l in combined["links"] if l.get("relation") == cfg["cochangeRelation"]]
        check("control: the combined graph is a multigraph", combined["multigraph"] is True, combined["multigraph"])
        check("control: each co-change pair is written both ways", len(co) == 2 * len(cc["edges"]) and {(l["source"], l["target"]) for l in co} >= {("scripts_a", "scripts_b"), ("scripts_b", "scripts_a")}, co)
        check("control: a file node anchors its file over a document node of the same file", not any("a_header" in (l["source"], l["target"]) for l in co), co)
        check("control: a pair that already shares an import keeps it beside the co-change edges",
              sum(1 for l in combined["links"] if {l["source"], l["target"]} == {"scripts_a", "scripts_b"}) == 3, combined["links"])
        check("control: a file node anchors its file", any(l["source"] == "scripts_a" and l["relation"] == cfg["cochangeRelation"] for l in co), co)
        check("control: a document anchors on its document node at the earliest line",
              any(l["source"] == "doc_title" for l in co) and not any(l["source"] == "doc_rule" for l in co), co)
        new = [n for n in combined["nodes"] if n.get("source_file") == "notes/new.md"]
        check("control: a file the graph lacks gets one overlay node", len(new) == 1 and new[0]["_origin"] == OVERLAY, new)
        check("control: co-change edges carry the configured context", all(l.get("context") == cfg["cochangeContext"] for l in co), co)
        wired = [l for l in combined["links"] if l.get("_origin") == OVERLAY]
        check("control: wiring edges carry the configured context", wired != [] and all(l.get("context") == cfg["wiringContext"] for l in wired), wired)
        check("control: each cluster is a hyperedge", any(h["relation"] == "co_change_cluster" and set(h["nodes"]) == {"scripts_a", "scripts_b"} for h in combined["hyperedges"]), combined["hyperedges"])
        check("control: the wiring's script and job get overlay nodes", any(n["label"] == "check" for n in nodes.values()) and any(n["label"] == "job pre-push/check" for n in nodes.values()), list(nodes))
        keys = {f["key"] for f in report["findings"]}
        check("control: a deleted file is reported gone", "freshness|gone|scripts/deleted.mjs" in keys, keys)
        check("control: a package node is not taken for a file", not any("js-yaml" in k for k in keys), keys)
        check("control: a graph older than HEAD is reported stale, with the rebuild named",
              any(f["key"] == "freshness|graph|commit" and "is stale" in f["reason"] and "npm run code-graph" in f["reason"] for f in report["findings"]), report["findings"])
        check("control: a pair with no graph edge is a hidden lead", "hidden|docs/doc.md|scripts/a.mjs" in keys, keys)
        check("control: a pair with a graph edge is not", not any(k.startswith("hidden|scripts/a.mjs") for k in keys), keys)
        check("control: a pair with a file the graph lacks is not", not any("notes/new.md" in k for k in keys if k.startswith("hidden")), keys)
        check("control: a pair under the map's cluster index is not", "hidden|scripts/b.mjs|scripts/c.mjs" not in keys, keys)
        check("control: a pair with a hub is not", "hidden|docs/hub.md|scripts/c.mjs" not in keys, keys)
        check("control: a tracked code file the graph lacks is reported absent", f"freshness|absent|{cfg['pathRootsFrom']['file']}" in keys, keys)
        check("control: a data file graphify gives no node is not", f"freshness|absent|{cfg['graphExtensionsPolicy']['file']}" not in keys, keys)
        head = (env_git("rev-parse", "HEAD") or "").strip()
        verdict = next((f["reason"] for f in report["findings"] if f["key"] == "freshness|graph|commit"), "")
        check("control: the verdict names the graph's commit and HEAD", f"built at `{built[:12]}`, HEAD is `{head[:12]}`" in verdict, verdict)
        md = (folder / "graph-report.md").read_text(encoding="utf-8")
        fresh = md.split("## Freshness", 1)[1].strip().split("\n")[0]
        check("control: the report's freshness section opens with the verdict", "`graph`: `commit`" in fresh, fresh)
        check("control: an implements edge to a rule is a pairing lead", "pairing|scripts/b.mjs|Rule X" in keys, keys)
        check("control: the clusters table names the communities", report["tables"]["clusters"][0]["files"] == 2, report["tables"]["clusters"])
        status = report["loader"]["status"]
        check("control: the loader check loses nothing, or says why it is skipped", status in ("ok", "skipped") and (status == "ok" or "graphify" in report["loader"]["detail"]), report["loader"])
        first = (folder / "graph-report.json").read_bytes()
        run(root, "2026-01-02", out=out)
        check("control: a second run writes the same bytes", (folder / "graph-report.json").read_bytes() == first, "the report changed")

        # The writer's own check, doctored output.
        one_way = json.loads(json.dumps(combined))
        one_way["links"] = [l for l in one_way["links"] if not (l.get("relation") == cfg["cochangeRelation"] and l["source"] == "scripts_b" and l["target"] == "scripts_a")]
        problems = verify_overlay(one_way, cc, cfg)
        check("a co-change pair written one way is refused, for that reason", any("scripts/a.mjs and scripts/b.mjs is not written in both directions" in p for p in problems), problems)
        flat = dict(combined, multigraph=False)
        problems = verify_overlay(flat, cc, cfg)
        check("multigraph false with a shared pair is refused, for that reason", any("`multigraph` is false" in p for p in problems), problems)
        dangling = dict(combined, links=combined["links"] + [{"source": "nobody", "target": "scripts_a", "relation": "x"}])
        check("a link to no node is refused, for that reason", any("name a node the graph lacks" in p for p in verify_overlay(dangling, cc, cfg)), "accepted")
        if status == "ok":
            flat_path = tmp / "flat.json"
            flat_path.write_text(json.dumps(flat), encoding="utf-8")
            lost = loader_check(flat_path)
            check("graphify's loader loses an edge from the same graph with multigraph false", lost[0] == "lost" and lost[1] >= 1, lost)

        # A graph whose commit this clone does not have: nothing is called gone, and it says why.
        unknown = dict(graph, built_at_commit="f" * 40)
        (tmp / "unknown.json").write_text(json.dumps(unknown), encoding="utf-8")
        (tmp / "out-unknown" / "2026-01-02").mkdir(parents=True)
        (tmp / "out-unknown" / "2026-01-02" / "harness.json").write_text(json.dumps(core), encoding="utf-8")
        served_bytes = combined_path.read_bytes()
        other, other_folder = run(root, "2026-01-02", graph_path=tmp / "unknown.json", out=tmp / "out-unknown")
        okeys = {f["key"] for f in other["findings"]}
        check("an unreadable graph commit calls no file gone, and says so",
              "freshness|graph|unknown commit" in okeys and not any(k.startswith("freshness|gone|") for k in okeys), okeys)
        check("a graph named with --graph gets its combined graph beside the report, not served",
              other["read"]["served"] is False and (other_folder / "combined.json").exists() and not (tmp / "combined.json").exists(), other["read"])
        check("and the served combined graph is untouched", combined_path.read_bytes() == served_bytes, "rewritten")
        own = other_folder / "combined.json"
        try:
            run(root, "2026-01-02", graph_path=own, out=tmp / "out-unknown")
            check("a graph that is where the combined graph would go is refused", False, "accepted")
        except Refusal as error:
            check("a graph that is where the combined graph would go is refused, for that reason", "is where the combined graph would be written" in str(error), str(error))

        # From a linked worktree, the graph is the primary checkout's, as code-graph.mjs builds it.
        linked = tmp / "linked"
        env_git("worktree", "add", "-q", "-b", "linked", str(linked))
        found = graph_root(linked, False)
        check("a linked worktree finds the graph under the primary checkout", found.resolve() == root.resolve(), str(found))
        check("a doctored root keeps its own graph", graph_root(linked, True) == linked, "moved")
        # A worktree's wiring and map are its branch's: its combined graph must not reach the server.
        (out / "2026-01-05").mkdir()
        (out / "2026-01-05/harness.json").write_text(json.dumps(core), encoding="utf-8")
        wt_report, wt_folder = run(linked, "2026-01-05", out=out)
        check("from a linked worktree, the combined graph goes beside the report, not served",
              wt_report["read"]["served"] is False and (wt_folder / "combined.json").exists(), wt_report["read"])
        check("and the primary checkout's served combined graph is untouched", combined_path.read_bytes() == served_bytes, "rewritten by a worktree")

        # The inputs.
        reply = run(root, "2026-01-02", graph_path=tmp / "none.json", out=out)
        check("no graph: nothing is written and the reason names the rebuild", reply[0] is None and "npm run code-graph" in reply[1], reply)
        try:
            run(root, "2026-01-03", out=out)
            check("no core report for the date is refused", False, "accepted")
        except Refusal as error:
            check("no core report for the date is refused, for that reason", "`npm run harness` writes it" in str(error), str(error))
        doctored = json.loads((root / CONFIG).read_text(encoding="utf-8"))
        del doctored["cochangeRelationMeans"]
        (root / CONFIG).write_text(json.dumps(doctored), encoding="utf-8")
        try:
            read_config(root)
            check("a config without a Means is refused", False, "accepted")
        except Refusal as error:
            check("a config without a Means is refused, for that reason", "`cochangeRelationMeans` is missing" in str(error), str(error))
        (root / CONFIG).write_text(fixture_cfg_text, encoding="utf-8")

        # The comparison.
        (out / "2026-01-04").mkdir()
        (out / "2026-01-04/harness.json").write_text(json.dumps(core), encoding="utf-8")
        cc_later = dict(cc, edges=[e for e in cc["edges"] if e["a"] != "docs/doc.md"])
        (root / cfg["cochangeMap"]).write_text(json.dumps(cc_later), encoding="utf-8")
        later, _ = run(root, "2026-01-04", out=out)
        check("a later run names the lead that went", later["comparison"]["previous"] == "2026-01-02" and "hidden|docs/doc.md|scripts/a.mjs" in later["comparison"]["went"], later["comparison"])
        check("a later run says the script did not change", later["comparison"]["scriptChanged"] is False, later["comparison"])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for failure in failures:
        print(f"  FAIL {failure}", file=sys.stderr)
    print(f"harness graph selftest: {passed} passed, {len(failures)} failed.")
    return 1 if failures else 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="The graph half of the harness assessment (the header of tools/harness/graph.py).")
    parser.add_argument("--date", default=None, help="the core report's date; default today")
    parser.add_argument("--graph", default=None, help="a graph.json; default the one graphifyOutDir names")
    parser.add_argument("--out", default=None, help="the report folder; default the config's reportDir")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    import datetime
    date = args.date or datetime.date.today().isoformat()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        print("harness:graph: --date takes YYYY-MM-DD", file=sys.stderr)
        return 1
    try:
        report, folder = run(default_root(), date, args.graph, args.out)
    except Refusal as error:
        print(f"harness:graph: {error}", file=sys.stderr)
        return 1
    if report is None:
        print(f"harness:graph: skipped: {folder}")
        return 0
    s = report["summary"]
    print(f"harness:graph: {s['findings']} findings, {s['leads']} leads, {s['notes']} notes; combined graph of {s['nodes']} nodes and {s['links']} links; loader {report['loader']['status']}; wrote {folder}.")
    if report["read"]["served"]:
        print(f"harness:graph: wrote {report['read']['combined']}; `npm run code-graph:mcp` registers the server on it.")
    else:
        print(f"harness:graph: wrote {report['read']['combined']} beside the report, not served: run from the checkout that holds the graph, with no --graph, to serve it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
