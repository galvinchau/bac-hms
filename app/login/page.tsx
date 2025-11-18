// app/login/page.tsx
import { Suspense } from "react";
import LoginForm from "./LoginForm";

// Đảm bảo trang này luôn render động (không static SSG)
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
