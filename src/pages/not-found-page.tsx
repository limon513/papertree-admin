import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <p className="text-5xl font-semibold text-brand-700">404</p>
      <p className="font-medium text-zinc-900">This page doesn't exist</p>
      <p className="text-sm text-zinc-500">The link may be wrong or the page was moved.</p>
      <Button variant="outline" size="sm" asChild className="mt-2">
        <Link to="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}
