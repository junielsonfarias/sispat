import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useImovel } from '@/contexts/ImovelContext';
import { useDebounceValue } from '@/hooks/use-debounce';
import { useAuth } from '@/hooks/useAuth';
import { Imovel } from '@/types';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Edit,
  Plus,
  Search,
  Trash,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type SortConfig = {
  column: keyof Imovel;
  direction: 'asc' | 'desc';
};

const getPaginationItems = (currentPage: number, pageCount: number) => {
  const delta = 1;
  const range = [];
  for (
    let i = Math.max(2, currentPage - delta);
    i <= Math.min(pageCount - 1, currentPage + delta);
    i++
  ) {
    range.push(i);
  }

  if (currentPage - delta > 2) {
    range.unshift('...');
  }
  if (currentPage + delta < pageCount - 1) {
    range.push('...');
  }

  range.unshift(1);
  if (pageCount > 1) {
    range.push(pageCount);
  }

  return [...new Set(range)];
};

export default function ImoveisList() {
  const { imoveis, deleteImovel } = useImovel();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounceValue(searchTerm, 300);
  const [pagination, setPagination] = useState({ pageIndex: 1, pageSize: 10 });
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  });

  const processedData = useMemo(() => {
    const filtered = imoveis.filter(
      p =>
        p.denominacao
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        p.numero_patrimonio.includes(debouncedSearchTerm) ||
        p.endereco.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sorting.column];
      const bValue = b[sorting.column];
      if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [imoveis, debouncedSearchTerm, sorting]);

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.pageIndex - 1) * pagination.pageSize;
    return processedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [processedData, pagination]);

  const pageCount = Math.ceil(processedData.length / pagination.pageSize);
  const paginationItems = getPaginationItems(pagination.pageIndex, pageCount);

  const handleSort = (column: keyof Imovel) => {
    setSorting(prev => ({
      column,
      direction:
        prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortableHeader = ({
    column,
    label,
  }: {
    column: keyof Imovel;
    label: string;
  }) => {
    const isSorted = sorting.column === column;
    const Icon = isSorted
      ? sorting.direction === 'asc'
        ? ArrowUp
        : ArrowDown
      : ChevronsUpDown;
    return (
      <Button variant='ghost' onClick={() => handleSort(column)}>
        {label}
        <Icon className='ml-2 h-4 w-4' />
      </Button>
    );
  };

  const canDelete = user?.role === 'supervisor' || user?.role === 'admin';

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Cadastro de Imóveis</h1>
        <Button asChild>
          <Link to='/imoveis/novo'>
            <Plus className='mr-2 h-4 w-4' /> Cadastrar Imóvel
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Buscar por número, denominação ou endereço...'
              className='pl-10'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortableHeader
                      column='numero_patrimonio'
                      label='Nº Patrimônio'
                    />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column='denominacao' label='Denominação' />
                  </TableHead>
                  <TableHead>
                    <SortableHeader column='endereco' label='Endereço' />
                  </TableHead>
                  <TableHead className='text-right'>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item: Imovel) => (
                  <TableRow key={item.id}>
                    <TableCell className='font-medium'>
                      <Link
                        to={`/imoveis/ver/${item.id}`}
                        className='hover:underline text-primary'
                      >
                        {item.numero_patrimonio}
                      </Link>
                    </TableCell>
                    <TableCell>{item.denominacao}</TableCell>
                    <TableCell>{item.endereco}</TableCell>
                    <TableCell className='text-right'>
                      <Button variant='ghost' size='icon' asChild>
                        <Link to={`/imoveis/editar/${item.id}`}>
                          <Edit className='h-4 w-4' />
                        </Link>
                      </Button>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='text-destructive hover:text-destructive'
                            >
                              <Trash className='h-4 w-4' />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Tem certeza que deseja excluir este imóvel?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteImovel(item.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className='flex items-center justify-between'>
          <div className='text-sm text-muted-foreground'>
            Mostrando {paginatedData.length} de {processedData.length}{' '}
            resultados.
          </div>
          <Pagination
            meta={{
              count: paginatedData.length,
              limit: pagination.pageSize,
              hasMore: pagination.pageIndex < pageCount,
              hasPrev: pagination.pageIndex > 1,
              nextUrl:
                pagination.pageIndex < pageCount
                  ? `?page=${pagination.pageIndex + 1}`
                  : undefined,
              prevUrl:
                pagination.pageIndex > 1
                  ? `?page=${pagination.pageIndex - 1}`
                  : undefined,
            }}
            onPageChange={(cursor, direction) => {
              if (direction === 'next' && pagination.pageIndex < pageCount) {
                setPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }));
              } else if (direction === 'prev' && pagination.pageIndex > 1) {
                setPagination(p => ({ ...p, pageIndex: p.pageIndex - 1 }));
              } else if (direction === 'first') {
                setPagination(p => ({ ...p, pageIndex: 1 }));
              }
            }}
            onLimitChange={limit => {
              setPagination(p => ({ ...p, pageSize: limit, pageIndex: 1 }));
            }}
            showLimitSelector={true}
            showPageInfo={true}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
