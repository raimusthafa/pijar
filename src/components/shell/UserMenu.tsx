'use client';

import { Menu } from '@base-ui/react/menu';
import { LogOut } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

export type ShellUser = { name?: string | null; email?: string | null };

function initial(user?: ShellUser) {
  return (user?.name || user?.email || 'P').trim().charAt(0).toUpperCase();
}

/** Avatar button with a one-item menu. Sign out posts to the existing /auth/logout route. */
export function UserMenu({ user }: { user?: ShellUser }) {
  const { t } = useT();
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t('shell.user.menu')}
        className="pj-press grid size-11 place-items-center rounded-pill md:size-9"
      >
        <span className="grid size-8 place-items-center rounded-pill bg-amber text-sm font-semibold text-amber-foreground">
          {initial(user)}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-56 origin-(--transform-origin) rounded-inner border border-hairline bg-popover p-1.5 text-sm outline-none transition-[opacity,transform] duration-150 ease-out-pj data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:data-starting-style:scale-100">
            <div className="px-3 py-2">
              <p className="truncate font-medium">{user?.name || t('shell.user.guest')}</p>
              {user?.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
            </div>
            <form method="post" action="/auth/logout" className="border-t border-hairline pt-1.5">
              <Menu.Item
                render={<button type="submit" />}
                nativeButton
                className="flex h-11 w-full cursor-default items-center gap-2 rounded-control px-3 text-left outline-none data-highlighted:bg-hover md:h-9"
              >
                <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
                {t('common.action.signOut')}
              </Menu.Item>
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
