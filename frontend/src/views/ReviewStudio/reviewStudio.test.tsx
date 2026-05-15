import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { expect, test, vi, beforeEach } from "vitest";
import { ReviewStudioView } from "./ReviewStudioView";

// vi.mock is hoisted — factory must not reference module-level variables.
const mockPatchCandidate = vi.fn().mockResolvedValue({});
const mockCommit = vi.fn().mockResolvedValue({ status: "committed" });

vi.mock("../../api/client", () => ({
  api: {
    candidates: vi.fn().mockResolvedValue({
      job_id: "test-job-123",
      source_note: "Test source",
      source_title: "My Test Job",
      blocking_errors: [],
      node_candidates: [
        { id: "n0", proposed_node_id: "pn0", matched_existing_node_id: null, action: "create", review_status: "pending", title: "Node 0", category: "Experiment", summary: null, status: "active", importance: "medium" },
        { id: "n1", proposed_node_id: "pn1", matched_existing_node_id: null, action: "create", review_status: "pending", title: "Node 1", category: "Experiment", summary: null, status: "active", importance: "medium" },
        { id: "n2", proposed_node_id: "pn2", matched_existing_node_id: null, action: "create", review_status: "pending", title: "Node 2", category: "Experiment", summary: null, status: "active", importance: "medium" },
        { id: "n3", proposed_node_id: "pn3", matched_existing_node_id: null, action: "create", review_status: "pending", title: "Node 3", category: "Experiment", summary: null, status: "active", importance: "medium" },
        { id: "n4", proposed_node_id: "pn4", matched_existing_node_id: null, action: "create", review_status: "pending", title: "Node 4", category: "Experiment", summary: null, status: "active", importance: "medium" },
      ],
      edge_candidates: [
        { id: "e0", source: "n0", target: "n1", matched_source_node_id: null, matched_target_node_id: null, relation_type: "related", strength: "medium", review_status: "pending", description: null },
        { id: "e1", source: "n1", target: "n2", matched_source_node_id: null, matched_target_node_id: null, relation_type: "related", strength: "medium", review_status: "pending", description: null },
        { id: "e2", source: "n2", target: "n3", matched_source_node_id: null, matched_target_node_id: null, relation_type: "related", strength: "medium", review_status: "pending", description: null },
      ],
      detail_candidates: [],
    }),
    patchCandidate: (...args: unknown[]) => mockPatchCandidate(...args),
    commit: (...args: unknown[]) => mockCommit(...args),
    reject: vi.fn().mockResolvedValue({}),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/?job=test-job-123");
});

test("approving all 8 candidates enables Commit which posts patches then commit and navigates", async () => {
  const onNavigate = vi.fn();
  const onToast = vi.fn();

  render(<ReviewStudioView onNavigate={onNavigate} onToast={onToast} />);

  // Wait for candidates to load
  expect(await screen.findByText("My Test Job")).toBeInTheDocument();
  expect(screen.getByText(/8 candidates total/)).toBeInTheDocument();

  // Commit is disabled while pending decisions remain
  const commitBtn = screen.getByRole("button", { name: /Commit/i });
  expect(commitBtn).toBeDisabled();

  // Approve all candidates — DecBtn renders "✓" for approve
  const allButtons = screen.getAllByRole("button");
  const tickBtns = allButtons.filter((b) => b.textContent?.trim() === "✓");
  for (const btn of tickBtns) {
    fireEvent.click(btn);
  }

  // After approving all, pendingCount = 0 → commit button is enabled
  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Commit/i })).not.toBeDisabled();
  });

  fireEvent.click(screen.getByRole("button", { name: /Commit/i }));

  await waitFor(() => {
    // 5 node patches + 3 edge patches = 8 total PATCH calls
    expect(mockPatchCandidate).toHaveBeenCalledTimes(8);
    expect(mockCommit).toHaveBeenCalledWith("test-job-123");
    expect(onNavigate).toHaveBeenCalledWith("momentum");
  });
});
