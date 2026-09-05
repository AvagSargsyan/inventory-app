import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import type { NavLinkRenderProps } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Container } from "@/components/Container";

type NavItem = { to: string; label: string };

const NAV: readonly NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/categories", label: "Categories" },
  { to: "/products", label: "Products" },
];

// Weight as well as colour, so the active link is not signalled by hue alone.
// NavLink sets aria-current="page" itself.
const navLink = ({ isActive }: NavLinkRenderProps): string =>
  cn(
    "flex min-h-11 items-center rounded-lg px-2 hover:text-primary",
    isActive ? "font-bold text-primary" : "text-foreground",
  );

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Radix closes on Escape and outside clicks, but not on navigation. Wiring
  // SheetClose onto each link would miss browser back and forward, so this
  // tracks the URL itself.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="border-b border-border bg-card">
      <Container className="flex min-h-16 items-center justify-between gap-4">
        <Link to="/" className="font-heading text-2xl font-bold text-primary">
          FakeStore
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-5">
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/"} className={navLink}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex md:gap-3">
          <Button asChild>
            <Link to="/products/new">Add Product</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/categories/new">Add Category</Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            {/* size="icon" is 32px; the design floor is 44px. */}
            <Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-72">
            <SheetTitle className="font-heading text-primary">FakeStore</SheetTitle>
            <nav className="flex flex-col gap-1 px-4">
              {NAV.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === "/"} className={navLink}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-col gap-3 px-4">
              <Button asChild>
                <Link to="/products/new">Add Product</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/categories/new">Add Category</Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
}
