import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default function LogoutButton() {
  async function logout() {
    "use server";
    // In Next.js 15, cookies() is async in server actions
    const cookieStore = await cookies();
    cookieStore.delete("auth");
    redirect("/login");
  }

  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-foreground text-sm transition"
        title="Logout"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9.75 3a.75.75 0 0 1 .75-.75h6A2.25 2.25 0 0 1 18.75 4.5v15A2.25 2.25 0 0 1 16.5 21.75h-6a.75.75 0 0 1 0-1.5h6a.75.75 0 0 0 .75-.75v-15a.75.75 0 0 0-.75-.75h-6a.75.75 0 0 1-.75-.75Zm-1.5 4.5a.75.75 0 0 1 1.06 0l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 1 1-1.06-1.06L9.44 12 8.25 10.81a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          <path d="M3 12a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Z" />
        </svg>
        <span>Logout</span>
      </button>
    </form>
  );
}