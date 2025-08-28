import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBreakpoint } from '@/components/ui/responsive-container';
import { cn } from '@/lib/utils';
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react';
import React from 'react';

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
  showOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // high = sempre visível, medium = visível em tablet+, low = desktop apenas
}

export interface TableAction<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  show?: (item: T) => boolean;
}

interface MobileOptimizedTableProps<T extends { id: string | number }> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  showRowNumbers?: boolean;
  highlightRow?: (item: T) => boolean;
}

export function MobileOptimizedTable<T extends { id: string | number }>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  className,
  showRowNumbers = false,
  highlightRow
}: MobileOptimizedTableProps<T>) {
  const { isMobile, isTablet } = useBreakpoint();

  // Filtrar colunas baseado no breakpoint
  const visibleColumns = columns.filter(column => {
    if (isMobile) {
      return column.showOnMobile !== false && column.priority === 'high';
    }
    if (isTablet) {
      return column.priority !== 'low';
    }
    return true;
  });

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  // Renderização mobile (cards)
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item, index) => (
          <Card 
            key={item.id}
            className={cn(
              "transition-colors hover:bg-muted/50",
              onRowClick && "cursor-pointer",
              highlightRow?.(item) && "border-primary bg-primary/5"
            )}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                {showRowNumbers && (
                  <div className="text-xs text-muted-foreground">
                    #{index + 1}
                  </div>
                )}
                
                {visibleColumns.map((column) => {
                  const value = column.render ? column.render(item) : item[column.key];
                  const label = column.mobileLabel || column.header;
                  
                  return (
                    <div key={String(column.key)} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0 mr-3">
                        {label}:
                      </span>
                      <div className="text-sm text-right min-w-0 flex-1">
                        {value}
                      </div>
                    </div>
                  );
                })}

                {actions.length > 0 && (
                  <div className="flex justify-end pt-2 mt-3 border-t">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, actionIndex) => {
                          if (action.show && !action.show(item)) return null;
                          
                          return (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                              className={action.variant === 'destructive' ? 'text-destructive' : ''}
                            >
                              {action.icon && <span className="mr-2">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Renderização desktop/tablet (tabela tradicional)
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {showRowNumbers && (
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-16">
                  #
                </th>
              )}
              {visibleColumns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-20">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={item.id}
                className={cn(
                  "border-b hover:bg-muted/50 transition-colors",
                  onRowClick && "cursor-pointer",
                  highlightRow?.(item) && "bg-primary/5 border-primary/20"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {showRowNumbers && (
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {index + 1}
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm">
                    {column.render ? column.render(item) : String(item[column.key] || '')}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, actionIndex) => {
                          if (action.show && !action.show(item)) return null;
                          
                          return (
                            <DropdownMenuItem
                              key={actionIndex}
                              onClick={(e) => {
                                e.stopPropagation();
                                action.onClick(item);
                              }}
                              className={action.variant === 'destructive' ? 'text-destructive' : ''}
                            >
                              {action.icon && <span className="mr-2">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Exemplo de uso com Patrimônio
export function PatrimonioMobileTable({ patrimonios, onView, onEdit, onDelete }: {
  patrimonios: any[];
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
}) {
  const columns: TableColumn<any>[] = [
    {
      key: 'numero_patrimonio',
      header: 'Nº Patrimônio',
      mobileLabel: 'Número',
      priority: 'high',
      render: (item) => (
        <span className="font-mono font-medium">{item.numero_patrimonio}</span>
      )
    },
    {
      key: 'descricao',
      header: 'Descrição',
      mobileLabel: 'Descrição',
      priority: 'high',
      render: (item) => (
        <div>
          <p className="font-medium">{item.descricao}</p>
          {item.marca && (
            <p className="text-xs text-muted-foreground">{item.marca}</p>
          )}
        </div>
      )
    },
    {
      key: 'setor_responsavel',
      header: 'Setor',
      mobileLabel: 'Setor',
      priority: 'medium'
    },
    {
      key: 'status',
      header: 'Status',
      mobileLabel: 'Status',
      priority: 'high',
      render: (item) => (
        <Badge variant={item.status === 'ATIVO' ? 'default' : 'secondary'}>
          {item.status}
        </Badge>
      )
    },
    {
      key: 'valor_aquisicao',
      header: 'Valor',
      mobileLabel: 'Valor',
      priority: 'low',
      render: (item) => (
        <span className="font-mono">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(item.valor_aquisicao)}
        </span>
      )
    }
  ];

  const actions: TableAction<any>[] = [
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: onView || (() => {}),
      show: () => !!onView
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: onEdit || (() => {}),
      show: () => !!onEdit
    },
    {
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete || (() => {}),
      variant: 'destructive',
      show: () => !!onDelete
    }
  ].filter(action => action.show && action.show({}));

  return (
    <MobileOptimizedTable
      data={patrimonios}
      columns={columns}
      actions={actions}
      showRowNumbers
      highlightRow={(item) => item.status === 'EM_MANUTENCAO'}
    />
  );
}
