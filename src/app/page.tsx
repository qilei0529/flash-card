import { DeckList } from "@/components/DeckList";

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl">
        <DeckList />
      </div>
    </main>
  );
}
