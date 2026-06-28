import { AppSidebar } from "@/components/app-sidebar"
import { OnboardingModal } from "@/components/onboarding-modal"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getCurrentSession } from "@/modules/auth/actions/auth.actions"
import { getCurrentOrganization } from "@/lib/tenant"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getCurrentSession()
  
  if (!session) {
    redirect("/login")
  }

  let organization = null
  let userOrganizations: any[] = []
  try {
    const orgRes = await prisma.organization.findMany({
      where: {
        users: { some: { id: session.userId } }
      },
      select: {
        id: true,
        name: true,
        currency: true,
        logoUrl: true,
      }
    })
    userOrganizations = orgRes

    organization = await getCurrentOrganization()
  } catch (e) {
    // ignorar error
  }

  const showOnboarding = !organization

  return (
    <SidebarProvider>
      <AppSidebar session={session} organization={organization} userOrganizations={userOrganizations} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium">Panel de Control</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-3 sm:p-6">
          {children}
        </main>
      </SidebarInset>
      <OnboardingModal isOpen={showOnboarding} />
    </SidebarProvider>
  )
}
