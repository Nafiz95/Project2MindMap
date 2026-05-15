import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { expect, test, vi } from "vitest";
import { parseChips, EvidenceChip } from "./EvidenceChip";

// --- Unit tests for the @[...] serialisation helpers ---

test("parseChips splits plain text and chip tokens correctly", () => {
  const text = "Introduction @[node-1|Alpha Study|Experiment] and @[node-2|Beta Paper|Paper] are relevant.";
  const parts = parseChips(text);

  // ["Introduction ", chip1, " and ", chip2, " are relevant."]
  expect(parts).toHaveLength(5);
  expect(parts[0]).toBe("Introduction ");
  expect(parts[1]).toEqual({ nodeId: "node-1", displayText: "Alpha Study", category: "Experiment" });
  expect(parts[2]).toBe(" and ");
  expect(parts[3]).toEqual({ nodeId: "node-2", displayText: "Beta Paper", category: "Paper" });
  expect(parts[4]).toBe(" are relevant.");
});

test("parseChips returns single string when no chip tokens present", () => {
  const parts = parseChips("No citations here.");
  expect(parts).toHaveLength(1);
  expect(parts[0]).toBe("No citations here.");
});

test("parseChips handles chip at start and end of string", () => {
  const text = "@[n1|Start|Grant] middle @[n2|End|Writing]";
  const parts = parseChips(text);

  expect(parts[0]).toEqual({ nodeId: "n1", displayText: "Start", category: "Grant" });
  expect(parts[1]).toBe(" middle ");
  expect(parts[2]).toEqual({ nodeId: "n2", displayText: "End", category: "Writing" });
});

test("parseChips with two @[...] tokens extracts both nodeIds and categories", () => {
  const raw = "See @[abc123|Concept A|Model] and also @[def456|Study B|Paper].";
  const chips = parseChips(raw).filter((p) => typeof p !== "string");

  expect(chips).toHaveLength(2);
  expect((chips[0] as { nodeId: string }).nodeId).toBe("abc123");
  expect((chips[1] as { nodeId: string }).nodeId).toBe("def456");
  expect((chips[1] as { category: string }).category).toBe("Paper");
});

// --- Component test: EvidenceChip renders with correct text and fires callback ---

test("EvidenceChip renders displayText and fires onFocus callback", () => {
  const onFocus = vi.fn();
  render(
    <EvidenceChip
      nodeId="node-1"
      displayText="Alpha Study"
      category="Experiment"
      onFocus={onFocus}
    />
  );

  const chip = screen.getByText("Alpha Study");
  expect(chip).toBeInTheDocument();
  expect(chip).toHaveClass("evidenceChipInline");

  chip.click();
  expect(onFocus).toHaveBeenCalledWith("node-1");
});
