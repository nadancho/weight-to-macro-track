import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOrUpdateDailyLog,
  getLogsByDateRange,
} from "./index";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/app/lib/integrations/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

function chainMock(endValue: { data?: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(endValue),
    maybeSingle: vi.fn().mockResolvedValue(endValue),
    single: vi.fn().mockResolvedValue(endValue),
  };
  return chain;
}

describe("logs module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
  });

  describe("getLogsByDateRange", () => {
    it("returns logs when authenticated", async () => {
      const logs = [
        { id: "1", user_id: "user-1", date: "2025-02-01", weight: 70 },
      ];
      mockFrom.mockReturnValue(chainMock({ data: logs }));

      const result = await getLogsByDateRange("2025-02-01", "2025-02-28");
      expect(result).toEqual(logs);
      expect(mockFrom).toHaveBeenCalledWith("daily_logs");
    });

    it("returns empty array when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await getLogsByDateRange("2025-02-01", "2025-02-28");
      expect(result).toEqual([]);
    });
  });

  describe("createOrUpdateDailyLog", () => {
    it("inserts new log when no existing row", async () => {
      const newRow = {
        id: "new-1",
        user_id: "user-1",
        date: "2025-02-13",
        weight: 71,
        carbs_g: null,
        protein_g: null,
        fat_g: null,
        notes: null,
        created_at: "",
        updated_at: "",
      };
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return chainMock({ data: null });
        }
        return chainMock({ data: newRow });
      });

      const result = await createOrUpdateDailyLog({
        date: "2025-02-13",
        weight: 71,
      });
      expect(result).not.toBeNull();
      expect(result?.date).toBe("2025-02-13");
      expect(result?.weight).toBe(71);
    });

    it("returns null when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const result = await createOrUpdateDailyLog({
        date: "2025-02-13",
        weight: 70,
      });
      expect(result).toBeNull();
    });
  });
});
