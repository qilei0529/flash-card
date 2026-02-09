import { DeckList } from "@/components/DeckList";

export default function Home() {
  return (
    <main className="min-h-screen p-6 sm:p-8 md:p-12">
      <div className="mx-auto max-w-4xl">
        <DeckList />
      </div>
    </main>
  );
}
