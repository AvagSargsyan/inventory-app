import { cn } from "cn";

// auto-fill reflows 1 -> 2 -> 3 columns with no media query. The min() keeps
// the track from overflowing a container narrower than 16rem.
export function CardGrid({ as: Component = "div", className, ...props }) {
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
export function CardGridItem({ className, ...props }) {
  return <li className={cn("flex flex-col", className)} {...props} />;
}
