import * as React from "react";
import { cn } from "@/lib/utils";

/** Centered content container with the standard page max-width + horizontal padding. */
function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1100px] px-4 sm:px-6", className)} {...props} />;
}

/** Vertical rhythm wrapper for a landing section, with a Container inside. */
function Section({ className, children, ...props }: React.ComponentProps<"section">) {
  return (
    <section className={cn("py-16 sm:py-20", className)} {...props}>
      <Container>{children}</Container>
    </section>
  );
}

export { Container, Section };
