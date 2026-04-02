"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layers, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// --- Types ---

interface Badge {
  id: string;
  name: string;
  rarity: string;
  image_path: string | null;
}

interface Member {
  id: string;
  set_id: string;
  badge_id: string;
  weight: number;
  badge: Badge;
}

interface EncounterSet {
  id: string;
  name: string;
  condition: {
    source: string;
    key: string;
    operator: string;
    value?: number | boolean | string;
  } | null;
  members: Member[];
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-zinc-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  unique: "text-amber-400",
  legendary: "text-orange-400",
};

const TIER_ODDS: Record<string, number> = {
  common: 35,
  rare: 20,
  epic: 12,
  unique: 5,
  legendary: 3,
};

// --- Page ---

export default function EncounterSetsPage() {
  const { userId } = useAuth();
  const [sets, setSets] = useState<EncounterSet[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);

  // New set form
  const [newName, setNewName] = useState("");
  const [newSource, setNewSource] = useState<"attribute" | "event">("event");
  const [newKey, setNewKey] = useState("");
  const [newOperator, setNewOperator] = useState("gte");
  const [newValue, setNewValue] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchSets = useCallback(async () => {
    const res = await fetch("/api/admin/encounter-sets", { credentials: "include" });
    const data = await res.json();
    setSets(data ?? []);
  }, []);

  useEffect(() => {
    if (userId !== ADMIN_UUID) return;
    Promise.all([
      fetchSets(),
      fetch("/api/collectibles", { credentials: "include" })
        .then((r) => r.json())
        .then(() =>
          // Fetch all badges directly
          fetch("/api/admin/encounter-sets", { credentials: "include" })
            .then((r) => r.json())
        ),
      // Get all badges from the collectibles endpoint
      fetch("/api/collectibles", { credentials: "include" }).then((r) => r.json()),
    ]).then(([, , collectiblesData]) => {
      // Extract unique badges from all sources
      const badgeMap = new Map<string, Badge>();
      if (Array.isArray(collectiblesData)) {
        for (const c of collectiblesData) {
          if (c.badge) badgeMap.set(c.badge.id, c.badge);
        }
      }
      setBadges(Array.from(badgeMap.values()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, fetchSets]);

  const handleCreateSet = async () => {
    setCreating(true);
    try {
      const condition = isDefault
        ? null
        : {
            source: newSource,
            key: newKey,
            operator: newOperator,
            value: isNaN(Number(newValue)) ? newValue : Number(newValue),
          };

      const res = await fetch("/api/admin/encounter-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName, condition }),
      });
      if (res.ok) {
        setNewName("");
        setNewKey("");
        setNewValue("");
        setIsDefault(false);
        setShowCreateForm(false);
        await fetchSets();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    await fetch(`/api/admin/encounter-sets/${setId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchSets();
  };

  const handleAddMember = async (setId: string, badgeId: string) => {
    await fetch(`/api/admin/encounter-sets/${setId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ badge_id: badgeId, weight: 1 }),
    });
    await fetchSets();
  };

  const handleRemoveMember = async (setId: string, memberId: string) => {
    await fetch(`/api/admin/encounter-sets/${setId}/members/${memberId}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetchSets();
  };

  if (userId !== ADMIN_UUID) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="size-6" aria-hidden />
          Encounter Sets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure creature pools and conditions for the two-stage reveal system
        </p>
      </div>

      {/* Tier odds reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tier Roll Probabilities (fixed)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap text-xs">
            {Object.entries(TIER_ODDS).map(([tier, pct]) => (
              <span key={tier} className={cn("font-medium", RARITY_COLORS[tier])}>
                {tier}: {pct}%
              </span>
            ))}
            <span className="text-muted-foreground">nothing: 25%</span>
          </div>
        </CardContent>
      </Card>

      {/* Encounter sets list */}
      {sets.map((set) => {
        const isExpanded = expandedSetId === set.id;
        const memberBadgeIds = new Set(set.members.map((m) => m.badge_id));
        const availableBadges = badges.filter((b) => !memberBadgeIds.has(b.id));

        return (
          <Card key={set.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setExpandedSetId(isExpanded ? null : set.id)}
                >
                  <CardTitle className="text-base">{set.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {set.condition
                      ? `${set.condition.source}.${set.condition.key} ${set.condition.operator} ${set.condition.value ?? ""}`
                      : "Always active (default)"}
                    {" · "}
                    {set.members.length} creature{set.members.length !== 1 ? "s" : ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSet(set.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={`Delete ${set.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-3">
                {/* Members */}
                {set.members.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No creatures in this set</p>
                ) : (
                  <div className="space-y-1.5">
                    {set.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", RARITY_COLORS[member.badge.rarity])}>
                            {member.badge.rarity}
                          </span>
                          <span className="text-sm">{member.badge.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">wt: {member.weight}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(set.id, member.id)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                            aria-label={`Remove ${member.badge.name}`}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add creature */}
                {availableBadges.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Add creature</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableBadges.map((badge) => (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => handleAddMember(set.id, badge.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-1 text-xs hover:bg-white/[0.06] transition-colors"
                        >
                          <Plus className="size-3" />
                          <span className={RARITY_COLORS[badge.rarity]}>{badge.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Create new set */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Encounter Set</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="set-name" className="text-xs">Name</Label>
              <Input
                id="set-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., high-protein"
                className="h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is-default" className="text-xs">Always active (no condition)</Label>
            </div>

            {!isDefault && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Source</Label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as "attribute" | "event")}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="event">Event (log data)</option>
                    <option value="attribute">Attribute (profile)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Key</Label>
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g., protein_g"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Operator</Label>
                  <select
                    value={newOperator}
                    onChange={(e) => setNewOperator(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="eq">eq</option>
                    <option value="gt">gt</option>
                    <option value="gte">gte</option>
                    <option value="lt">lt</option>
                    <option value="lte">lte</option>
                    <option value="exists">exists</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Value</Label>
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="e.g., 100"
                    className="h-9"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleCreateSet}
                disabled={creating || !newName}
                className="min-h-[44px]"
              >
                <Save className="size-4" aria-hidden />
                {creating ? "Creating..." : "Create Set"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowCreateForm(true)}
          className="min-h-[44px]"
        >
          <Plus className="size-4" aria-hidden />
          New Encounter Set
        </Button>
      )}
    </div>
  );
}
