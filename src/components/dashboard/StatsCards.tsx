import React from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  TrendingUp,
  CheckCircle,
  Wrench,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface StatsData {
  totalCount: number
  totalValue: number
  activePercentage: number
  maintenanceCount: number
  baixadosLastMonth: number
  setoresCount: number
}

interface StatsCardsProps {
  stats: StatsData
  totalImoveis: number
  valorTotalImoveis: number
}

export const StatsCards = ({ stats, totalImoveis, valorTotalImoveis }: StatsCardsProps) => {
  const valorTotal = stats.totalValue + valorTotalImoveis
  const valorFormatado = formatCurrency(valorTotal)
  
  // Função para determinar tamanho da fonte baseado no comprimento do valor
  const getFontSize = (value: string) => {
    const length = value.length
    if (length <= 10) return 'text-xl sm:text-2xl lg:text-3xl' // R$ 1.234,56
    if (length <= 15) return 'text-lg sm:text-xl lg:text-2xl'   // R$ 123.456,78
    if (length <= 20) return 'text-base sm:text-lg lg:text-xl'  // R$ 12.345.678,90
    return 'text-sm sm:text-base lg:text-lg'                      // R$ 123.456.789,00+
  }

  const cards = [
    {
      title: 'Total de Bens',
      value: stats.totalCount.toLocaleString(),
      unit: 'patrimônios',
      subtitle: `${totalImoveis.toLocaleString()} imóveis`,
      icon: Package,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      link: '/patrimonios',
      isHighlight: false,
      fontSize: 'text-xl sm:text-2xl lg:text-3xl',
    },
    {
      title: 'Valor Total',
      value: valorFormatado,
      unit: '',
      subtitle: `${stats.activePercentage}% em bom estado`,
      icon: TrendingUp,
      gradient: 'from-green-500 to-emerald-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-600 dark:text-green-400',
      link: '/relatorios',
      isHighlight: true, // Destacar este card
      fontSize: getFontSize(valorFormatado),
    },
    {
      title: 'Bens Ativos',
      value: (stats.totalCount - stats.maintenanceCount - stats.baixadosLastMonth).toLocaleString(),
      unit: 'ativos',
      subtitle: `${stats.maintenanceCount} em manutenção`,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      link: '/patrimonios?status=ativo',
      isHighlight: false,
      fontSize: 'text-xl sm:text-2xl lg:text-3xl',
    },
    {
      title: 'Manutenção',
      value: stats.maintenanceCount.toLocaleString(),
      unit: 'bens',
      subtitle: `${stats.baixadosLastMonth} baixados este mês`,
      icon: Wrench,
      gradient: 'from-orange-500 to-amber-600',
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400',
      link: '/patrimonios?status=manutencao',
      isHighlight: false,
      fontSize: 'text-xl sm:text-2xl lg:text-3xl',
    },
    {
      title: 'Setores',
      value: stats.setoresCount.toLocaleString(),
      unit: 'setores',
      subtitle: 'Distribuição organizacional',
      icon: Building2,
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      link: '/setores',
      isHighlight: false,
      fontSize: 'text-xl sm:text-2xl lg:text-3xl',
    },
    {
      title: 'Alertas',
      value: (stats.maintenanceCount + stats.baixadosLastMonth).toLocaleString(),
      unit: 'itens',
      subtitle: 'Requerem atenção',
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-600 dark:text-red-400',
      link: '/alertas',
      isHighlight: false,
      fontSize: 'text-xl sm:text-2xl lg:text-3xl',
    },
  ]

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Linha 1: Total de Bens + Valor Total + Bens Ativos */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-4">
        {cards.slice(0, 3).map((card, index) => {
          const Icon = card.icon
          const isValorTotal = card.isHighlight
          
          return (
            <Link 
              key={index} 
              to={card.link}
              className={isValorTotal ? 'lg:col-span-2' : ''}
            >
            <Card className={`
              border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02] 
              bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden group
              ${isValorTotal ? 'ring-2 ring-green-500/30 dark:ring-green-400/30 shadow-green-500/20' : ''}
              hover:bg-white dark:hover:bg-gray-800/95
            `}>
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 text-xs sm:text-sm">
                      {card.title}
                    </p>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <h3 className={`
                        ${card.fontSize} font-bold text-gray-900 dark:text-white
                        ${isValorTotal ? 'break-all' : 'truncate'}
                      `}>
                        {card.value}
                      </h3>
                      {card.unit && (
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {card.unit}
                        </span>
                      )}
                    </div>
                  </div>
                    <div className={`${card.iconBg} rounded-xl group-hover:scale-110 transition-transform flex-shrink-0 ml-2 p-2.5 sm:p-3`}>
                      <Icon className={`${card.iconColor} h-5 w-5 sm:h-6 sm:w-6`} />
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </Link>
            )
          })}
      </div>

      {/* Linha 2: Manutenção + Setores + Alertas (ocupando toda a linha) */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        {cards.slice(3).map((card, index) => {
          const Icon = card.icon
          
          // Cores específicas para cada card
          const cardColors = [
            { bg: 'bg-orange-500/10', icon: 'text-orange-600 dark:text-orange-400' }, // Manutenção
            { bg: 'bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' }, // Setores
            { bg: 'bg-red-500/10', icon: 'text-red-600 dark:text-red-400' }          // Alertas
          ]
          
          const colors = cardColors[index] || cardColors[0]
          
          return (
            <Link 
              key={index + 3} 
              to={card.link}
            >
              <Card className={`
                border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-[1.02] 
                bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm overflow-hidden group
                hover:bg-white dark:hover:bg-gray-800/95
              `}>
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 text-xs sm:text-sm">
                        {card.title}
                      </p>
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                          {card.value}
                        </h3>
                        {card.unit && (
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {card.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`${colors.bg} rounded-xl group-hover:scale-110 transition-transform flex-shrink-0 ml-2 p-2.5 sm:p-3`}>
                      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colors.icon}`} />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {card.subtitle}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
