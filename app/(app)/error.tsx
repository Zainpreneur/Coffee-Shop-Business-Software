"use client";

import { useEffect } from "react";
import { Button, Card, PageHeader } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card className="p-6">
        <PageHeader title="Something went wrong" subtitle={error.message || "An unexpected error occurred."} />
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}
