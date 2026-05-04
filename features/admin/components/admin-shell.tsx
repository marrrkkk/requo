"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/shared/brand-mark";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getAdminBreadcrumbs } from "@/features/admin/admin-breadcrumbs";
import { adminNavigationItems } from "@/features/admin/constants";
import type { AdminContext } from "@/features/admin/types";
import { cn } from "@/lib/utils";

type AdminShellProps = {
  admin: AdminContext;
  children: ReactNode;
};

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4.25rem",
        } as CSSProperties
      }
    >
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-0 px-0 py-0">
          <div className="flex h-[4.5rem] items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
            <BrandMark
              collapseLabel
              className="min-w-0 px-2 py-1.5"
              subtitle="Internal admin"
              href="/admin"
            />
          </div>
          <SidebarSeparator />
        </SidebarHeader>

        <SidebarContent className="gap-4 px-1 pb-3 group-data-[collapsible=icon]:px-0">
          <SidebarGroup className="px-3 pt-3 group-data-[collapsible=icon]:px-2">
            <SidebarMenu>
              {adminNavigationItems.map((item) => (
                <AdminNavigationItem
                  isActive={isActive(pathname, item.href)}
                  item={item}
                  key={item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="min-h-9 rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground"
                tooltip="Back to app"
              >
                <Link href="/">
                  <ArrowLeft className="text-muted-foreground" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Back to app
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="min-w-0 px-3 py-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs text-muted-foreground">
              {admin.email}
            </p>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh min-w-0">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-inner">
            <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-3 md:flex-nowrap">
              <SidebarTrigger className="shrink-0" />
              <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 self-center bg-border md:block"
              />
              <div className="hidden min-w-0 flex-1 md:block">
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((item, index) => {
                      const isLast = index === breadcrumbs.length - 1;

                      return (
                        <Fragment key={`${item.label}-${item.href ?? index}`}>
                          {index > 0 ? <BreadcrumbSeparator /> : null}
                          <BreadcrumbItem>
                            {isLast || !item.href ? (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link href={item.href} prefetch={true}>
                                  {item.label}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <main className="dashboard-main">
            <div className="dashboard-content">{children}</div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type AdminNavigationItemProps = {
  isActive: boolean;
  item: (typeof adminNavigationItems)[number];
};

function AdminNavigationItem({ isActive, item }: AdminNavigationItemProps) {
  const Icon = item.icon;
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className="min-h-9 rounded-lg border border-transparent px-3 py-1.5 data-[active=true]:border-sidebar-primary/12 data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-primary data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:data-[active=true]:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          href={item.href}
          prefetch={true}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Icon
            className={cn(
              "text-muted-foreground transition-transform [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)]",
              isActive && "text-primary",
            )}
          />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
