import { cn } from "cn";

// The page gutter and max width, shared by the header, footer and every page.
export function Container({ className, ...props }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 md:px-8", className)} {...props} />;
}
