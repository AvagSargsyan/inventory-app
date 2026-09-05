import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/Container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center gap-6 py-12 text-center md:py-16">
      <h1 className="font-heading text-[clamp(2rem,8vw,3rem)] font-bold">Page not found</h1>
      <p className="max-w-[65ch] text-muted-foreground">
        That page does not exist, or has not been built yet.
      </p>
      <Button asChild>
        <Link to="/">Back to home</Link>
      </Button>
    </Container>
  );
}
