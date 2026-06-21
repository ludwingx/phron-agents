"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  // Datos fijos o mock para la organización por defecto si la carga es asíncrona
  const teamsData = [
    {
      name: "Mi Comercio",
      logo: <HugeiconsIcon icon={Store01Icon} strokeWidth={2} />,
      plan: "Plan Pro",
    }
  ]

  const userData = {
    name: "Administrador",
    email: "admin@phronagents.com",
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
      title: "IA Agentes",
      url: "/dashboard/agents",
      icon: <HugeiconsIcon icon={RoboticIcon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/agents"),
    },
    {
      title: "Inbox Chat",
      url: "/dashboard/conversations",
      icon: <HugeiconsIcon icon={Message01Icon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/conversations"),
    },
    {
      title: "Productos",
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
      title: "Clientes",
      url: "/dashboard/customers",
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/customers"),
    },
    {
      title: "Ajustes",
      url: "/dashboard/settings",
      icon: <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />,
      isActive: pathname.startsWith("/dashboard/settings"),
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamsData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
