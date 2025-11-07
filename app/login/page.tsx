export default function LoginPage() {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-md card p-6">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-bac-primary/20 grid place-items-center text-bac-primary">
            <span className="text-2xl">🩺</span>
          </div>
          <h1 className="text-2xl font-semibold mt-3">Blue Angels Care</h1>
          <p className="text-sm text-bac-muted">Health Management System</p>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="input" placeholder="admin1@blueangelscare.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input className="input" type="password" placeholder="••••••••" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-blue-500"
              defaultChecked
            />
            <span className="text-sm text-bac-muted">Remember me</span>
          </div>
          <button className="btn w-full">Login</button>
        </form>

        <div className="mt-6 text-center text-xs text-bac-muted">
          Demo: admin1@blueangelscare.com / password123
        </div>

        <div className="mt-6 text-center text-[11px] text-bac-muted">
          © 2025 Blue Angels Care. All rights reserved. <br /> Secure Healthcare
          Management
        </div>
      </div>
    </div>
  );
}
