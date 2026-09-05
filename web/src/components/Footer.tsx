import { Link } from "react-router-dom";
import { Container } from "@/components/Container";

export function Footer() {
  return (
    <footer className="bg-footer text-white">
      <Container className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-heading font-bold">FakeStore</div>
          <div className="text-sm text-white/70">© 2026 FakeStore Management System.</div>
        </div>
        <nav className="flex flex-wrap gap-x-5">
          <Link to="/categories" className="flex min-h-11 items-center hover:underline">
            Categories
          </Link>
          <Link to="/products" className="flex min-h-11 items-center hover:underline">
            Products
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
