import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/Container";

export default function Home() {
  return (
    <Container className="flex flex-col items-center gap-6 py-12 text-center md:py-16">
      {/* clamp so the hero scales instead of jumping at a breakpoint. */}
      <h1 className="font-heading text-[clamp(2rem,8vw,3rem)] font-bold">Welcome to FakeStore</h1>
      <p className="max-w-[65ch] text-muted-foreground">
        FakeStore keeps track of what you stock and how it is organised. Group products into
        categories, keep prices and stock levels current, and see it all in one place.
      </p>
      <div className="flex w-full max-w-80 flex-col gap-3 md:w-auto md:max-w-none md:flex-row">
        <Button asChild>
          <Link to="/products">View Products</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/categories">View Categories</Link>
        </Button>
      </div>
    </Container>
  );
}
