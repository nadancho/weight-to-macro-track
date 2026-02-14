import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Weight Gain Tracker</h1>
      <p className="mt-2 text-muted-foreground">Track your weight and macros.</p>
      <Button className="mt-4">Get started</Button>
    </main>
  );
}
