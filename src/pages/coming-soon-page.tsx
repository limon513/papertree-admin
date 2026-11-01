import { Construction } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/misc';
import { PageHeader } from '@/components/layout/page-header';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Construction />}
          title="This section is coming soon"
          description="It's part of a later step of the build. Your access to it is already set up."
        />
      </Card>
    </div>
  );
}
