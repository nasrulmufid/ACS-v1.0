import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Login | CPE Management",
};

// Server Action: validate credentials from .env and set auth cookie
async function loginAction(_prevState: { error?: string } | undefined | void, formData: FormData): Promise<{ error?: string } | void> {
  "use server";
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  const ENV_USER = process.env.USER_LOGIN || "";
  const ENV_PASS = process.env.PASSWORD_LOGIN || "";

  if (username === ENV_USER && password === ENV_PASS) {
    // Simple cookie flag; expires in 7 days (Next.js 15: cookies() is async in server actions)
    const cookieStore = await cookies();
    cookieStore.set("auth", "ok", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/");
  }

  return { error: "Username atau password salah." };
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/70 text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-foreground/10 bg-background/70 backdrop-blur p-8 shadow-xl">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">Selamat Datang</h1>
            <p className="text-sm text-foreground/60">Masuk untuk mengakses CPE Management Dashboard</p>
          </div>

          <LoginForm action={loginAction} />

        
        </div>
      </div>
    </div>
  );
}