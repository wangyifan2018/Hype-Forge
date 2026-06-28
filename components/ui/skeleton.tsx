import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-terminal-border/60",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
