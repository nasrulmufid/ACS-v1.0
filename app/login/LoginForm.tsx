"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { EyeClosedIcon, EyeOpenIcon, LockClosedIcon, PersonIcon } from "@radix-ui/react-icons";

type FormState = { error?: string };

type Props = {
  // Allow void per React 19/Next 15 typings for useFormState
  action: (state: FormState | undefined | void, formData: FormData) => Promise<FormState | void> | FormState | void;
};

export default function LoginForm({ action }: Props) {
  const [state, formAction] = useFormState(action, undefined as FormState | undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      {/* Username */}
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">Username</label>
        <div className="relative">
          <PersonIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/60" />
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            className="w-full h-11 rounded-xl pl-10 pr-3 bg-background/60 border border-foreground/10 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/60 transition text-sm"
            placeholder="Masukkan username"
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <div className="relative">
          <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/60" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full h-11 rounded-xl pl-10 pr-11 bg-background/60 border border-foreground/10 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/60 transition text-sm"
            placeholder="Masukkan password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-foreground/70 hover:text-foreground/90 hover:bg-foreground/5"
          >
            {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        className="w-full h-11 rounded-xl bg-primary text-white font-medium hover:brightness-110 active:brightness-95 transition focus:ring-4 focus:ring-primary/30"
      >
        Masuk
      </button>
    </form>
  );
}