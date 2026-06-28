import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hype-Forge | 爆款图文兵工厂",
  description: "跨境电商与社交媒体内容组装流水线 SOP Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className="font-mono antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            className:
              "font-mono text-xs border-terminal-border bg-terminal-panel",
          }}
        />
      </body>
    </html>
  );
}
