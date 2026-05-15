# Outline Document Format

## Inline Citation Syntax

Detail block content uses plain text with optional inline citation tokens. A citation token links to another node in the graph and renders as a styled chip in the Outline editor.

### Token format

```
@[nodeId|Display Text|category]
```

| Field | Description |
|---|---|
| `nodeId` | The `id` of the referenced node (e.g. `ct_clip`) |
| `Display Text` | Human-readable label shown in the chip |
| `category` | Node category (e.g. `Model`, `Experiment`, `Paper`) — controls chip colour |

**Example block content:**

```
The approach builds on @[ct_clip|CT-CLIP|Model] and was validated
against @[chexbert|CheXBert|Model] as a baseline. See also
@[r42|Radiology Benchmark 2024|Paper] for evaluation details.
```

### Parsing

`parseChips(text)` in `EvidenceChip.tsx` splits a string into an array of plain strings and `ChipToken` objects:

```ts
type ChipToken = { nodeId: string; displayText: string; category: string };
parseChips("Hello @[n1|Alpha|Model] world")
// → ["Hello ", { nodeId: "n1", displayText: "Alpha", category: "Model" }, " world"]
```

`serialiseChips(parts)` is the inverse — joins a mixed array back into a raw string.

### Persistence

Tokens are stored verbatim in the `detail_blocks.content` column as plain text. The PATCH endpoint (`PATCH /api/candidates/details/{id}`) accepts `{ content: string }` and writes it directly. No pre-processing is done server-side.

### Inserting citations

In the Outline editor, type `@` inside a block to trigger the `InlinePicker` overlay. Fuzzy-search by node title and press **Enter** or click to insert the token at the cursor position.

Alternatively, click **+ cite** on a suggestion card in the Evidence Sidebar — the token is appended to the currently active block.

### Evidence Sidebar sync

Whenever the active block changes or a save occurs, `parseChips` re-extracts all chip tokens and passes them to `EvidenceSidebar` as `citedChips`. The sidebar then:

1. Lists cited nodes (from `citedChips`) with a focus link (↗).
2. Computes `computeSuggestions()` — a one-hop walk over related edges that excludes already-cited nodes — and displays up to 5 suggestions.
