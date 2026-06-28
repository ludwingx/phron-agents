"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { UnfoldMoreIcon, PlusSignIcon } from "@hugeicons/core-free-icons"

import { switchOrganizationAction } from "@/modules/auth/actions/tenant.actions"
import { toast } from "sonner"

export function TeamSwitcher({
  teams,
  onAddTeam,
}: {
  teams: {
    id: string
    name: string
    logo: React.ReactNode
    plan: string
  }[]
  onAddTeam?: () => void
}) {
  const { isMobile } = useSidebar()
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
  const [prevTeams, setPrevTeams] = React.useState(teams)

  const teamsChanged =
    teams.length !== prevTeams.length ||
    teams.some((team, index) => team.id !== prevTeams[index]?.id)

  if (teamsChanged) {
    setPrevTeams(teams)
    if (teams.length > 0) {
      setActiveTeam(teams[0])
    }
  }

  const handleSwitch = async (team: typeof activeTeam) => {
    if (team.id === activeTeam?.id) {
      return
    }
    setActiveTeam(team)
    if (!team.id) return

    const res = await switchOrganizationAction(team.id)
    if (res.success) {
      toast.success(`Cambiado al negocio: ${team.name}`)
      window.location.reload()
    } else {
      toast.error(res.error || "Error al cambiar de negocio")
    }
  }

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeTeam.logo}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <HugeiconsIcon icon={UnfoldMoreIcon} strokeWidth={2} className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Negocios
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.id || team.name}
                onClick={() => handleSwitch(team)}
                className="gap-2 p-2 cursor-pointer"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {team.logo}
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onAddTeam}
              className="gap-2 p-2 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
              </div>
              <div className="font-medium">Añadir Negocio</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
