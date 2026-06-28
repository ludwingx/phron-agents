"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { OnboardingModal } from "@/components/onboarding-modal"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  LayoutBottomIcon,
  Settings05Icon,
  UserGroupIcon,
  Message01Icon,
  ShoppingBagIcon,
  RoboticIcon,
  Store01Icon
} from "@hugeicons/core-free-icons"

interface UserSession {
  userId: string
  organizationId: string
  fullName: string
  email: string
  role: string
}

interface OrganizationData {
  id: string
  name: string
  logoUrl: string | null
  currency: string
}

export function AppSidebar({
  session,
  organization,
  userOrganizations = [],
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  session: UserSession | null
  organization: OrganizationData | null
  userOrganizations?: OrganizationData[]
}) {
  const pathname = usePathname()
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = React.useState(false)

  // Mapear organizaciones de la base de datos o usar valor por defecto
  const teamsData = userOrganizations.length > 0
    ? userOrganizations.map(org => ({
      id: org.id,
      name: org.name,
      logo: <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />,
      plan: `Moneda: ${org.currency}`,
    }))
    : [
      {
        id: organization?.id || "",
        name: organization?.name || "Mi Comercio",
        logo: <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />,
        plan: `Moneda: ${organization?.currency || "USD"}`,
      }
    ]

  const activeTeam = teamsData.find(t => t.id === organization?.id) || teamsData[0]

  const userData = {
    name: session?.fullName || "Administrador",
    email: session?.email || "admin@phronagents.com",
    avatar: "",
  }

  const navigationItems = [
    {
      title: "Inicio",
      url: "/dashboard",
      icon: <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} />,
      isActive: pathname === "/dashboard",
    },
    {
      title: "Chatbot IA",
      url: "/dashboard/agents",
      icon: <HugeiconsIcon icon={RoboticIcon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/agents"),
    },
    {
      title: "Chats en Vivo",
      url: "/dashboard/conversations",
      icon: <HugeiconsIcon icon={Message01Icon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/conversations"),
    },
    {
      title: "Catálogo de Productos",
      url: "/dashboard/products",
      icon: <HugeiconsIcon icon={ShoppingBagIcon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/products"),
    },
    {
      title: "Integraciones",
      url: "/dashboard/integrations",
      icon: <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/integrations"),
    },
    {
      title: "Clientes / Leads",
      url: "/dashboard/customers",
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/customers"),
    },
    {
      title: "Configuración",
      url: "/dashboard/settings",
      icon: <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/settings"),
    },
  ]

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher teams={teamsData} onAddTeam={() => setIsNewOrgModalOpen(true)} />
        </SidebarHeader>
        <SidebarContent>
          <NavMain items={navigationItems} />
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={userData} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <OnboardingModal isOpen={isNewOrgModalOpen} />
    </>
  )
}
