import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";
import { cn } from "cn";

// Renders as div or ul. Their prop types differ only in the element their event
// handlers receive, and this component forwards nothing element-specific, so
// the attributes common to both is the honest type rather than a fully
// polymorphic one.
type CardGridProps = HTMLAttributes<HTMLElement> & { as?: "div" | "ul" };

// auto-fill reflows 1 -> 2 -> 3 columns with no media query. The min() keeps
// the track from overflowing a container narrower than 16rem.
export function CardGrid({ as: Component = "div", className, ...props }: CardGridProps) {
  return (
    <Component
      className={cn(
        "grid grid-cols-[repeat(auto-fill,minmax(min(16rem,100%),1fr))] gap-5",
        className,
      )}
      {...props}
    />
  );
}

// The grid item, so cards in a row share a height. Not `display: contents`,
// which drops list semantics in older engines.
export function CardGridItem({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return <li className={cn("flex flex-col", className)} {...props} />;
}
