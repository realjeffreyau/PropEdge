import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/components/layout/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PropEdge",
    template: "%s · PropEdge",
  },
  description: "Private sports betting analytics dashboard for NBA and WNBA player props.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full"
    >
      <body className="min-h-full antialiased bg-background text-foreground">
        <SessionProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
