/**
 * Home/Redirect Page
 * Redirects all traffic to the QA dashboard.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard (non-blocking if already there)
    router.push('/qa-dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Redirecting to dashboard...</p>
    </div>
  );
}
