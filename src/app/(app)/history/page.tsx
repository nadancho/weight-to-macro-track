"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  date: string;
  weight: number | null;
  carbs_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
};

function lastMonth(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    .toISOString()
    .slice(0, 10);
  return { from, to };
}

export default function HistoryPage() {
  const [authOk, setAuthOk] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(lastMonth());

  useEffect(() => {
    fetch("/api/profile", { credentials: "include" })
      .then((r) => setAuthOk(r.ok))
      .catch(() => setAuthOk(false));
  }, []);

  useEffect(() => {
    if (!authOk) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(
      `/api/logs?from=${range.from}&to=${range.to}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [authOk, range.from, range.to]);

  if (!authOk) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">You need to sign in to view history.</p>
        <Button asChild>
          <Link href="/">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>History</CardTitle>
        <div className="flex gap-2">
          <input
            type="date"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground">No logs in this range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Weight</th>
                  <th className="pb-2 pr-4">Carbs</th>
                  <th className="pb-2 pr-4">Protein</th>
                  <th className="pb-2">Fat</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border">
                    <td className="py-2 pr-4">{log.date}</td>
                    <td className="py-2 pr-4">{log.weight ?? "—"}</td>
                    <td className="py-2 pr-4">{log.carbs_g ?? "—"}</td>
                    <td className="py-2 pr-4">{log.protein_g ?? "—"}</td>
                    <td className="py-2">{log.fat_g ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
