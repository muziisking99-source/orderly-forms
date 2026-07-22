import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinkClass =
  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&.active]:bg-[var(--brand-navy)] [&.active]:text-white";

const mobileLinkClass =
  "block rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&.active]:bg-[var(--brand-navy)] [&.active]:text-white";

export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <img
            src="/golden-fresh-logo.png"
            alt="Golden Fresh"
            className="h-8 w-auto shrink-0 object-contain md:h-9"
          />
          <span className="truncate font-display text-xl leading-none tracking-tight text-[var(--brand-navy)] md:text-2xl">
            Order Requisition
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" activeOptions={{ exact: true }} className={navLinkClass}>
            New Order Requisition
          </Link>
          <Link to="/admin" className={navLinkClass}>
            Admin
          </Link>
        </nav>

        {/* Mobile nav */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
            <SheetHeader>
              <SheetTitle className="text-left font-display text-[var(--brand-navy)]">
                Menu
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className={mobileLinkClass}
                onClick={() => setOpen(false)}
              >
                New
              </Link>
              <Link to="/admin" className={mobileLinkClass} onClick={() => setOpen(false)}>
                Admin
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
