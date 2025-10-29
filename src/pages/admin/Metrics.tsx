import { Helmet } from 'react-helmet-async'
import MetricsDashboard from '@/components/dashboard/MetricsDashboard'

export default function Metrics() {
  return (
    <>
      <Helmet>
        <title>Métricas do Sistema - SISPAT 2.0</title>
        <meta name="description" content="Dashboard de métricas e monitoramento do sistema SISPAT 2.0" />
      </Helmet>
      <MetricsDashboard />
    </>
  )
}
