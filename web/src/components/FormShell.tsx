import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/Container";

// The centred form card: full width inside the page padding on a phone, capped
// at 720px once there is room.
export function FormShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="py-6 md:py-8">
      <Card className="px-5 md:mx-auto md:max-w-[45rem] md:px-6">
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        {children}
      </Card>
    </Container>
  );
}
