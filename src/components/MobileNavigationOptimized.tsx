/**
 * Navegação Mobile Otimizada para SISPAT 2.0
 * 
 * Este componente fornece uma navegação mobile otimizada
 * com melhor UX e performance
 */

import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'
import {
  Menu,
  X,
  Home,
  Archive,
  Building2,
  BarChart,
  Settings,
  Users,
  Bell,
  Search,
  Plus,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface NavItem {
  to?: string
  icon: React.ElementType
  label: string
  badge?: number
  children?: NavItem[]
  groupColor?: string
}

interface MobileNavGroup {
  label: string
  icon: React.ElementType
  items: NavItem[]
  groupColor?: string
}

const MobileNavigationOptimized: React.FC = () => {
  const { user } = useAuth()
  const { isMobile, screenWidth } = useMobile()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Grupos de navegação otimizados para mobile
  const navigationGroups: MobileNavGroup[] = [
    {
      label: 'Dashboard',
      icon: Home,
      groupColor: 'bg-blue-50 border-blue-200 text-blue-700',
      items: [
        { to: '/', icon: Home, label: 'Visão Geral' },
        { to: '/dashboard/depreciacao', icon: BarChart, label: 'Depreciação' }
      ]
    },
    {
      label: 'Patrimônio',
      icon: Archive,
      groupColor: 'bg-green-50 border-green-200 text-green-700',
      items: [
        { to: '/bens-cadastrados', icon: Archive, label: 'Bens Cadastrados' },
        { to: '/bens-cadastrados/novo', icon: Plus, label: 'Novo Cadastro' },
        { to: '/inventarios', icon: BarChart, label: 'Inventários' },
        { to: '/locais', icon: Building2, label: 'Locais' }
      ]
    },
    {
      label: 'Imóveis',
      icon: Building2,
      groupColor: 'bg-orange-50 border-orange-200 text-orange-700',
      items: [
        { to: '/imoveis', icon: Building2, label: 'Cadastro de Imóveis' },
        { to: '/imoveis/manutencao', icon: Settings, label: 'Manutenção' }
      ]
    },
    {
      label: 'Administração',
      icon: Users,
      groupColor: 'bg-red-50 border-red-200 text-red-700',
      items: [
        { to: '/configuracoes/usuarios', icon: Users, label: 'Usuários' },
        { to: '/configuracoes/setores', icon: Building2, label: 'Setores' },
        { to: '/admin/metrics', icon: BarChart, label: 'Métricas' }
      ]
    }
  ]

  // Filtrar itens baseado na busca
  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

  // Toggle grupo expandido
  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel)
      } else {
        newSet.add(groupLabel)
      }
      return newSet
    })
  }

  // Fechar menu ao navegar
  useEffect(() => {
    setIsOpen(false)
  }, [location])

  // Não renderizar em desktop
  if (!isMobile) return null

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-left">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">S</span>
                </div>
                <div>
                  <div className="font-semibold">SISPAT 2.0</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.name || 'Usuário'}
                  </div>
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Busca */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Navegação */}
            <nav className="p-4 space-y-2">
              {filteredGroups.map((group) => (
                <Collapsible
                  key={group.label}
                  open={expandedGroups.has(group.label)}
                  onOpenChange={() => toggleGroup(group.label)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-3 h-auto"
                    >
                      <div className="flex items-center space-x-3">
                        <group.icon className="h-5 w-5" />
                        <span className="font-medium">{group.label}</span>
                      </div>
                      {expandedGroups.has(group.label) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-1 ml-8">
                    {group.items.map((item) => (
                      <Link
                        key={item.to || item.label}
                        to={item.to || '#'}
                        className={cn(
                          'flex items-center justify-between p-2 rounded-lg transition-colors',
                          location.pathname === item.to
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground text-center">
              SISPAT 2.0 - Sistema de Patrimônio
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default MobileNavigationOptimized
