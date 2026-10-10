import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';

export default function LoginPage() {
  return <main className="min-h-dvh flex items-center justify-center p-6">
    <div className="w-full max-w-sm space-y-8">
      <Image src="/logo-dark.png" alt="EvoPixel" width={160} height={24} className="h-6 w-auto max-w-[160px]" priority unoptimized />
      <div className="space-y-2"><h1 className="text-2xl font-heading font-semibold">Entrar no CRM</h1><p className="text-sm text-[var(--evo-muted)]">Acesso exclusivo para a equipe autorizada da EvoPixel.</p></div>
      <LoginForm />
    </div>
  </main>;
}
