import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prop } from "@/types";

const prismaStub = vi.hoisted(() => ({
  propFeedSnapshot: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaStub }));

import { clearPropCache, readPropCache, writePropCache } from "@/lib/propCache";

const testProps = [{ id: "prop-1" }] as unknown as Prop[];
const sportKey = "basketball_nba";

describe("prop cache", () => {
  beforeEach(() => {
    clearPropCache();
    prismaStub.propFeedSnapshot.findFirst.mockReset();
    prismaStub.propFeedSnapshot.create.mockReset();
    prismaStub.propFeedSnapshot.findFirst.mockResolvedValue(null);
    prismaStub.propFeedSnapshot.create.mockResolvedValue({});
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves a memory hit without querying the database", async () => {
    const fetchedAt = new Date("2026-08-05T12:00:00.000Z");
    await writePropCache(sportKey, testProps, fetchedAt);
    prismaStub.propFeedSnapshot.findFirst.mockClear();

    const result = await readPropCache(sportKey);

    expect(result).toEqual({ props: testProps, fetchedAt, needsRefresh: false });
    expect(prismaStub.propFeedSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to the newest database snapshot after a memory miss", async () => {
    const fetchedAt = new Date("2026-08-05T12:00:00.000Z");
    prismaStub.propFeedSnapshot.findFirst.mockResolvedValue({
      fetchedAt,
      payload: testProps,
    });

    const result = await readPropCache(sportKey);

    expect(result).toEqual({ props: testProps, fetchedAt, needsRefresh: false });
    expect(prismaStub.propFeedSnapshot.findFirst).toHaveBeenCalledWith({
      where: { sportKey },
      orderBy: { fetchedAt: "desc" },
    });
  });

  it("reports needsRefresh only when memory and database are empty", async () => {
    const result = await readPropCache(sportKey);

    expect(result).toEqual({ props: [], fetchedAt: null, needsRefresh: true });
  });

  it("keeps the memory cache when database persistence throws", async () => {
    prismaStub.propFeedSnapshot.create.mockRejectedValue(new Error("database unavailable"));

    await expect(writePropCache(sportKey, testProps)).resolves.toBeUndefined();
    const result = await readPropCache(sportKey);

    expect(result.props).toEqual(testProps);
    expect(result.needsRefresh).toBe(false);
  });

  it("does not propagate a database read error", async () => {
    clearPropCache();
    prismaStub.propFeedSnapshot.findFirst.mockRejectedValue(new Error("database unavailable"));

    await expect(readPropCache(sportKey)).resolves.toEqual({
      props: [],
      fetchedAt: null,
      needsRefresh: true,
    });
  });
});
