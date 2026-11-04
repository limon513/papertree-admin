import type { BusinessStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

/** Business / request / blocked badges next to a customer's name. */
export function CustomerBadges({
  customer,
}: {
  customer: { type: 'retail' | 'business'; businessStatus: BusinessStatus | null; isBlocked: boolean };
}) {
  return (
    <>
      {customer.type === 'business' && customer.businessStatus === 'approved' && <Badge variant="violet">Business</Badge>}
      {customer.businessStatus === 'pending' && <Badge variant="amber">Business request</Badge>}
      {customer.businessStatus === 'rejected' && <Badge>Business rejected</Badge>}
      {customer.isBlocked && <Badge variant="red">Blocked</Badge>}
    </>
  );
}
