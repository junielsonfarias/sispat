import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { formatDate } from '@/lib/utils'
import { differenceInDays, isBefore } from 'date-fns'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const Emprestimos = () => {
  const { patrimonios } = usePatrimonio()

  const activeLoans = useMemo(() => {
    return patrimonios
      .filter((p) => p.emprestimo_ativo)
      .map((p) => ({
        patrimonio: p,
        loan: p.emprestimo_ativo!,
      }))
  }, [patrimonios])

  const getLoanStatus = (loan: { data_devolucao_prevista: Date }) => {
    const now = new Date()
    const dueDate = new Date(loan.data_devolucao_prevista)
    const daysRemaining = differenceInDays(dueDate, now)

    if (isBefore(dueDate, now)) {
      return {
        label: 'Atrasado',
        variant: 'destructive',
        icon: AlertTriangle,
      }
    }
    if (daysRemaining <= 7) {
      return {
        label: 'Vence em breve',
        variant: 'secondary',
        icon: Clock,
      }
    }
    return {
      label: 'Em dia',
      variant: 'default',
      icon: CheckCircle,
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Gerenciamento de Empréstimos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Empréstimos Ativos</CardTitle>
          <CardDescription>
            Acompanhe todos os bens que estão atualmente emprestados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Descrição do Bem</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Data do Empréstimo</TableHead>
                <TableHead>Devolução Prevista</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeLoans.map(({ patrimonio, loan }) => {
                const status = getLoanStatus(loan)
                return (
                  <TableRow key={patrimonio.id}>
                    <TableCell>
                      <Link
                        to={`/bens-cadastrados/ver/${patrimonio.id}`}
                        className="text-primary hover:underline"
                      >
                        {patrimonio.numero_patrimonio}
                      </Link>
                    </TableCell>
                    <TableCell>{patrimonio.descricao_bem}</TableCell>
                    <TableCell>{loan.destinatario}</TableCell>
                    <TableCell>{formatDate(loan.data_emprestimo)}</TableCell>
                    <TableCell>
                      {formatDate(loan.data_devolucao_prevista)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        <status.icon className="mr-2 h-4 w-4" />
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Emprestimos
