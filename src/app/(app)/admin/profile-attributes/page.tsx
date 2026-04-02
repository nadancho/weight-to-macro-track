"use client";

import { useAuth } from "@/components/auth-provider";
import { ADMIN_UUID } from "@/app/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// --- Types ---

interface ProfileAttribute {
  id: string;
  key: string;
  label: string;
  data_type: string;
  created_at: string;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  number: "Number",
  boolean: "Boolean",
  string: "String",
};

// --- Page ---

export default function ProfileAttributesPage() {
  const { userId } = useAuth();
  const [attrs, setAttrs] = useState<ProfileAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New attribute form
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("number");
  const [creating, setCreating] = useState(false);

  const fetchAttrs = useCallback(async () => {
    const res = await fetch("/api/admin/profile-attributes", { credentials: "include" });
    const data = await res.json();
    setAttrs(data ?? []);
  }, []);

  useEffect(() => {
    if (userId !== ADMIN_UUID) return;
    fetchAttrs().then(() => setLoading(false));
  }, [userId, fetchAttrs]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/profile-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: newKey, label: newLabel, data_type: newType }),
      });
      if (res.ok) {
        setNewKey("");
        setNewLabel("");
        setNewType("number");
        setShowCreateForm(false);
        await fetchAttrs();
      }
    } finally {
      setCreating(false);
    }
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
          <Database className="size-6" aria-hidden />
          Profile Attributes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define computed user attributes used by encounter set conditions
        </p>
      </div>

      {/* Attribute list */}
      <div className="space-y-2">
        {attrs.map((attr) => (
          <Card key={attr.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{attr.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{attr.key}</p>
              </div>
              <span className="text-xs rounded-full bg-muted px-2.5 py-0.5 font-medium">
                {DATA_TYPE_LABELS[attr.data_type] ?? attr.data_type}
              </span>
            </CardContent>
          </Card>
        ))}

        {attrs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No profile attributes defined
          </p>
        )}
      </div>

      {/* Create new attribute */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Attribute</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="attr-key" className="text-xs">Key (snake_case)</Label>
              <Input
                id="attr-key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g., days_above_100g_protein"
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attr-label" className="text-xs">Label</Label>
              <Input
                id="attr-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., Days Above 100g Protein"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data Type</Label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="string">String</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={creating || !newKey || !newLabel}
                className="min-h-[44px]"
              >
                <Save className="size-4" aria-hidden />
                {creating ? "Creating..." : "Create Attribute"}
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
          New Attribute
        </Button>
      )}
    </div>
  );
}
