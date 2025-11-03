import MetricsDashboard from '@/components/dashboard/MetricsDashboard'

export default function Metrics() {
  // ✅ Título da página pode ser gerenciado pelo router ou documento
  if (typeof document !== 'undefined') {
    document.title = 'Métricas do Sistema - SISPAT 2.0'
  }
  
  return <MetricsDashboard />
}
