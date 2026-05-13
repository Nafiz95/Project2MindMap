import { afterEach, expect, test, vi } from "vitest";

import { api, apiUrl } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("uses relative api URLs by default", () => {
  expect(apiUrl("/metadata")).toBe("/api/metadata");
  expect(apiUrl("/projects/demo/export/csv")).toBe("/api/projects/demo/export/csv");
});

test("rejects stale backend metadata", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ app: "Project2MindMap" }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(api.metadata()).rejects.toThrow("Backend is stale or incompatible");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/metadata",
    expect.objectContaining({ headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
  );
});
