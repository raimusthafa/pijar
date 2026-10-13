import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthSkeleton } from '@/components/auth/AuthFrame';

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
