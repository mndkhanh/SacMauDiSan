import { useState, type FormEvent } from "react";
import {
  registerWithStudentCode,
  loginWithStudentCode,
  resetStudentPassword,
} from "../lib/auth";

type View = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const [view, setView] = useState<View>("signin");
  const [name, setName] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setError("");
    setSuccessMsg("");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await loginWithStudentCode(studentCode);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    reset();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      await registerWithStudentCode(studentCode, name);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      await resetStudentPassword(studentCode);
      setSuccessMsg(
        `Password reset email sent to ${studentCode.toLowerCase()}@gmail.com`,
      );
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] px-4">
      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Logo / title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/30 mb-4">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l6.16-3.422A12.083 12.083 0 0121 21H3a12.083 12.083 0 012.84-10.422L12 14z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {view === "signin" && "Test"}
              {view === "signup" && "Create account"}
              {view === "forgot" && "Reset password"}
            </h1>
            <p className="text-sm text-white/40 mt-1">
              {view === "signin" && "Sign in with your student code"}
              {view === "signup" && "Register with your student code"}
              {view === "forgot" && "We'll send a reset link to your email"}
            </p>
          </div>

          {/* ── Sign In ── */}
          {view === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field
                id="signin-code"
                label="Student Code"
                placeholder="e.g. HS2024001"
                value={studentCode}
                onChange={setStudentCode}
              />

              {error && <ErrorBox message={error} />}

              <button
                id="btn-signin"
                type="submit"
                disabled={loading || !studentCode.trim()}
                className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/25 active:scale-[0.98]"
              >
                {loading ? <Spinner /> : "Sign In"}
              </button>

              <div className="flex justify-between text-sm pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView("forgot");
                    reset();
                  }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("signup");
                    reset();
                  }}
                  className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
                >
                  Create account →
                </button>
              </div>
            </form>
          )}

          {/* ── Sign Up ── */}
          {view === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <Field
                id="signup-name"
                label="Full Name"
                placeholder="Nguyen Van A"
                value={name}
                onChange={setName}
              />
              <Field
                id="signup-code"
                label="Student Code"
                placeholder="e.g. HS2024001"
                value={studentCode}
                onChange={setStudentCode}
              />

              <p className="text-xs text-white/30 -mt-1">
                Your password will be set to your student code. You can change
                it later.
              </p>

              {error && <ErrorBox message={error} />}

              <button
                id="btn-signup"
                type="submit"
                disabled={loading || !studentCode.trim() || !name.trim()}
                className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/25 active:scale-[0.98]"
              >
                {loading ? <Spinner /> : "Create Account"}
              </button>

              <div className="text-center text-sm pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    reset();
                  }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  Already have an account?{" "}
                  <span className="text-violet-400 hover:text-violet-300 font-medium">
                    Sign in
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ── Forgot Password ── */}
          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <Field
                id="forgot-code"
                label="Student Code"
                placeholder="e.g. HS2024001"
                value={studentCode}
                onChange={setStudentCode}
              />

              <p className="text-xs text-white/30 -mt-1">
                A reset link will be sent to{" "}
                <span className="text-white/50">
                  {studentCode
                    ? `${studentCode.toLowerCase()}@gmail.com`
                    : "studentcode@gmail.com"}
                </span>
              </p>

              {error && <ErrorBox message={error} />}
              {successMsg && <SuccessBox message={successMsg} />}

              <button
                id="btn-reset"
                type="submit"
                disabled={loading || !studentCode.trim()}
                className="w-full py-3 rounded-xl font-medium text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/25 active:scale-[0.98]"
              >
                {loading ? <Spinner /> : "Send Reset Link"}
              </button>

              <div className="text-center text-sm pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    reset();
                  }}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-6">
          SắcMàuDĩSản · Student Portal
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-white/60 mb-1.5"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/60 transition-all duration-200"
      />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
      <svg
        className="w-4 h-4 text-red-400 mt-0.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
      <svg
        className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <p className="text-sm text-emerald-300">{message}</p>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      Loading…
    </span>
  );
}

// ─── Firebase error → human-readable ──────────────────────────────────────────

function friendlyError(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: string }).code;
    const map: Record<string, string> = {
      "auth/invalid-credential": "Student code not found or incorrect.",
      "auth/user-not-found": "No account found for this student code.",
      "auth/wrong-password": "Incorrect student code.",
      "auth/email-already-in-use": "This student code is already registered.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/invalid-email": "Invalid student code format.",
    };
    return map[code] ?? `Error: ${code}`;
  }
  return "Something went wrong. Please try again.";
}
