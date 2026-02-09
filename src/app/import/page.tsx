import { Suspense } from "react";
import { ImportContent } from "@/components/ImportContent";

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8">Loading...</div>}>
      <ImportContent />
    </Suspense>
  );
}
