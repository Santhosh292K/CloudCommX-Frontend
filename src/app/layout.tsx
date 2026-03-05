import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CloudCommX",
  description: "CloudCommX frontend"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">CloudCommX</div>
            <nav className="nav">
              <a href="/">Home</a>
              <a href="/health">Health</a>
            </nav>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <span>© {new Date().getFullYear()} CloudCommX</span>
          </footer>
        </div>
      </body>
    </html>
  );
}

