import Link from "next/link";
import LogoutButton from "../LogoutButton";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur bg-background/70 border-b border-foreground/10">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold tracking-tight hover:opacity-80 transition">
            CPE Dashboard
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-foreground/70">
            <Link href="/" className="hover:text-foreground transition">Home</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}