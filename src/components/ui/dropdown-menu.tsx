import type { ComponentProps } from 'react';
import { DropdownMenu as Menu } from 'radix-ui';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, sideOffset = 6, align = 'end', ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg data-[state=open]:animate-fade-in',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

interface ItemProps extends ComponentProps<typeof Menu.Item> {
  danger?: boolean;
}

export function DropdownMenuItem({ className, danger, ...props }: ItemProps) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none select-none [&_svg]:size-4',
        danger
          ? 'text-red-600 data-[highlighted]:bg-red-50'
          : 'text-zinc-700 data-[highlighted]:bg-zinc-100 data-[highlighted]:text-zinc-900',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2.5 py-2 text-sm', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('my-1 h-px bg-zinc-100', className)} {...props} />;
}
