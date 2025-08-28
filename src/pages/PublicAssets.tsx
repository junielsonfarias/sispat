import { PublicSEO } from '@/components/PublicSEO';
import {
  PublicAssetsFilterSheet,
  PublicFilterValues,
} from '../components/public/PublicAssetsFilterSheet';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { useImovel } from '@/contexts/ImovelContext';
import { useMunicipalities } from '@/contexts/MunicipalityContext';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { usePublicSearch } from '@/contexts/PublicSearchContext';
import { useSync } from '@/contexts/SyncContext';
import { useDebounceValue } from '@/hooks/use-debounce';
import { formatRelativeDate } from '@/lib/utils';
import { Imovel, Patrimonio } from '@/types';
import { parseISO } from 'date-fns';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Filter,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type CombinedAsset = (Patrimonio | Imovel) & { assetType: 'bem' | 'imovel' };
type SortConfig = {
  column: keyof CombinedAsset | 'descricao';
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

const initialFilters: PublicFilterValues = {
  tipo: '',
  status: undefined,
  situacao: undefined,
  setor: '',
  dataAquisicaoInicio: '',
  dataAquisicaoFim: '',
};

export default function PublicAssets() {
  const { settings: publicSettings } = usePublicSearch();
  const { patrimonios } = usePatrimonio();
  const { imoveis } = useImovel();
  const { municipalities } = useMunicipalities();
  const { isSyncing, startSync, lastSync } = useSync();
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<
    string | null
  >(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounceValue(searchTerm, 300);
  const [pagination, setPagination] = useState({ pageIndex: 1, pageSize: 9 });
  const [assetTypeFilter, setAssetTypeFilter] = useState<
    'all' | 'bem' | 'imovel'
  >('all');
  const [filters, setFilters] = useState<PublicFilterValues>(initialFilters);
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sorting, setSorting] = useState<SortConfig>({
    column: 'numero_patrimonio',
    direction: 'asc',
  });
  const [publicAssets, setPublicAssets] = useState<CombinedAsset[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  const publicMunicipalities = useMemo(() => {
    console.log('🔍 PublicAssets - Debug info:');
    console.log(
      '  - Municipalities:',
      municipalities.length,
      municipalities.map(m => ({ id: m.id, name: m.name }))
    );
    console.log('  - PublicSettings:', publicSettings);
    console.log(
      '  - PublicMunicipalityIds:',
      publicSettings.publicMunicipalityIds
    );

    const filtered = municipalities.filter(m =>
      publicSettings.publicMunicipalityIds.includes(m.id)
    );

    console.log(
      '  - Filtered public municipalities:',
      filtered.length,
      filtered.map(m => ({ id: m.id, name: m.name }))
    );

    // Se não há municípios públicos válidos, mas há municípios carregados, incluir todos
    if (filtered.length === 0 && municipalities.length > 0) {
      console.log(
        '⚠️ Nenhum município público válido encontrado, incluindo todos os municípios disponíveis'
      );
      return municipalities;
    }

    return filtered;
  }, [municipalities, publicSettings]);

  const municipalityOptions: SearchableSelectOption[] =
    publicMunicipalities.map(m => ({
      value: m.id,
      label: m.name,
    }));

  const selectedMunicipality = useMemo(
    () => municipalities.find(m => m.id === selectedMunicipalityId),
    [municipalities, selectedMunicipalityId]
  );

  const combinedData: CombinedAsset[] = useMemo(() => {
    // Se já buscamos dados públicos para o município selecionado, priorize-os
    if (publicAssets.length > 0) {
      return publicAssets;
    }

    const bens: CombinedAsset[] = patrimonios.map(p => ({
      ...p,
      assetType: 'bem',
    }));
    const imoveisData: CombinedAsset[] = imoveis.map(i => ({
      ...i,
      assetType: 'imovel',
    }));
    return [...bens, ...imoveisData];
  }, [patrimonios, imoveis, publicAssets]);

  // Buscar dados públicos quando um município é selecionado
  useEffect(() => {
    const fetchPublicData = async () => {
      if (!selectedMunicipalityId) return;
      setIsLoadingPublic(true);
      try {
        // Buscar bens públicos
        const bensRes = await fetch(
          `/api/patrimonios/public?municipalityId=${selectedMunicipalityId}&limit=500`
        );
        const bensJson = bensRes.ok ? await bensRes.json() : [];
        const bens: CombinedAsset[] = Array.isArray(bensJson)
          ? bensJson.map((p: any) => ({
              ...p,
              assetType: 'bem' as const,
              // Garantir que a descrição seja exibida corretamente
              descricao: p.descricao || 'Sem descrição',
              tipo: p.tipo || 'Equipamento',
              status: p.status || 'Ativo',
              situacao_bem: p.situacao_bem || 'Em uso',
              setor_responsavel: p.setor_responsavel || 'Não informado',
              local_objeto: p.local_objeto || 'Não informado',
              data_aquisicao:
                p.data_aquisicao || new Date().toISOString().split('T')[0],
              fotos: p.fotos || [],
              // Garantir que municipalityId está presente
              municipalityId:
                p.municipality_id || p.municipalityId || selectedMunicipalityId,
            }))
          : [];

        // Buscar imóveis públicos
        const imoveisRes = await fetch(
          `/api/imoveis/public?municipalityId=${selectedMunicipalityId}&limit=500`
        );
        const imoveisJson = imoveisRes.ok ? await imoveisRes.json() : [];
        const imoveisList: CombinedAsset[] = Array.isArray(imoveisJson)
          ? imoveisJson.map((i: any) => ({
              ...i,
              assetType: 'imovel' as const,
            }))
          : [];

        const merged = [...bens, ...imoveisList];
        setPublicAssets(merged);
        console.log('🌐 Public data loaded:', {
          bens: bens.length,
          imoveis: imoveisList.length,
        });

        // Log detalhado dos dados processados
        bens.forEach((bem, index) => {
          console.log(`📋 Bem ${index + 1} processado:`, {
            numero_patrimonio: bem.numero_patrimonio,
            descricao: bem.descricao,
            setor_responsavel: bem.setor_responsavel,
            local_objeto: bem.local_objeto,
            situacao_bem: bem.situacao_bem,
          });
        });
      } catch (e) {
        console.log('❌ Erro ao carregar dados públicos:', e);
        setPublicAssets([]);
      } finally {
        setIsLoadingPublic(false);
      }
    };

    fetchPublicData();
  }, [selectedMunicipalityId]);

  const processedData = useMemo(() => {
    if (!selectedMunicipalityId) return [];

    const filtered = combinedData.filter(p => {
      // Se estamos usando dados públicos, não precisamos filtrar por município novamente
      // pois já foram filtrados na API
      const municipalityMatch =
        publicAssets.length > 0
          ? true
          : p.municipalityId === selectedMunicipalityId;
      if (!municipalityMatch) return false;

      const description =
        p.assetType === 'bem'
          ? (p as Patrimonio).descricao || ''
          : (p as Imovel).denominacao || '';
      const searchMatch =
        description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.numero_patrimonio.includes(debouncedSearchTerm);

      const assetTypeMatch =
        assetTypeFilter === 'all' || p.assetType === assetTypeFilter;

      const filterMatch =
        p.assetType === 'imovel' ||
        ((!filters.tipo ||
          (p as Patrimonio).tipo
            .toLowerCase()
            .includes(filters.tipo.toLowerCase())) &&
          (!filters.status || (p as Patrimonio).status === filters.status) &&
          (!filters.situacao ||
            (p as Patrimonio).situacao_bem === filters.situacao) &&
          (!filters.setor ||
            (p as Patrimonio).setor_responsavel
              .toLowerCase()
              .includes(filters.setor.toLowerCase())) &&
          (!filters.dataAquisicaoInicio ||
            new Date(p.data_aquisicao) >=
              parseISO(filters.dataAquisicaoInicio)) &&
          (!filters.dataAquisicaoFim ||
            new Date(p.data_aquisicao) <= parseISO(filters.dataAquisicaoFim)));

      return searchMatch && assetTypeMatch && filterMatch;
    });

    filtered.sort((a, b) => {
      const getSortableValue = (
        item: CombinedAsset,
        key: SortConfig['column']
      ) => {
        if (key === 'descricao') {
          return item.assetType === 'bem'
            ? (item as Patrimonio).descricao || (item as any).descricao || ''
            : (item as Imovel).denominacao || '';
        }
        return item[key];
      };

      const aValue = getSortableValue(a, sorting.column);
      const bValue = getSortableValue(b, sorting.column);

      if (aValue < bValue) return sorting.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sorting.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    combinedData,
    debouncedSearchTerm,
    selectedMunicipalityId,
    assetTypeFilter,
    filters,
    sorting,
    publicAssets.length,
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (pagination.pageIndex - 1) * pagination.pageSize;
    return processedData.slice(startIndex, startIndex + pagination.pageSize);
  }, [processedData, pagination]);

  const pageCount = Math.ceil(processedData.length / pagination.pageSize);
  const paginationItems = getPaginationItems(pagination.pageIndex, pageCount);

  const handleApplyFilters = (newFilters: PublicFilterValues) => {
    setPagination({ ...pagination, pageIndex: 1 });
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setPagination({ ...pagination, pageIndex: 1 });
    setFilters(initialFilters);
  };

  const handleSort = (column: SortConfig['column']) => {
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
    column: SortConfig['column'];
    label: string;
  }) => {
    const isSorted = sorting.column === column;
    const Icon = isSorted
      ? sorting.direction === 'asc'
        ? ArrowUp
        : ArrowDown
      : ChevronsUpDown;
    return (
      <Button
        variant='ghost'
        onClick={() => handleSort(column)}
        className='px-0 hover:bg-transparent'
      >
        {label}
        <Icon className='ml-2 h-4 w-4' />
      </Button>
    );
  };

  if (!publicSettings.isPublicSearchEnabled) {
    return (
      <div className='min-h-screen bg-muted/40 flex items-center justify-center p-4'>
        <Card className='w-full max-w-md text-center'>
          <CardHeader>
            <CardTitle>Consulta Pública Indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              A consulta pública de bens está temporariamente desabilitada. Por
              favor, tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50'>
      <div className='w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header com gradiente */}
        <div className='text-center mb-8'>
          {selectedMunicipality?.logoUrl && (
            <div className='w-20 h-20 bg-white rounded-xl p-3 shadow-lg mx-auto mb-6'>
              <img
                src={selectedMunicipality.logoUrl}
                alt={selectedMunicipality.name}
                className='w-full h-full object-contain'
              />
            </div>
          )}
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>
            Consulta Pública de Bens
          </h1>
          <p className='text-xl text-gray-600'>
            {selectedMunicipality?.name ||
              'Selecione um município para começar'}
          </p>
        </div>

        {!selectedMunicipalityId ? (
          <Card className='w-full max-w-md mx-auto mt-10 animate-fade-in shadow-xl border-0 bg-white/90 backdrop-blur-sm'>
            <CardHeader className='text-center'>
              <CardTitle className='text-2xl font-bold text-gray-800'>
                Selecione um Município
              </CardTitle>
              <CardDescription className='text-lg text-gray-600'>
                {municipalityOptions.length > 0
                  ? 'Escolha um município para visualizar os bens públicos.'
                  : 'Nenhum município disponível para consulta pública no momento.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='p-6'>
              {municipalityOptions.length > 0 ? (
                <SearchableSelect
                  options={municipalityOptions}
                  value={selectedMunicipalityId}
                  onChange={setSelectedMunicipalityId}
                  placeholder='Selecione...'
                />
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  <Archive className='h-16 w-16 mx-auto mb-4 opacity-50' />
                  <p className='text-lg font-medium mb-2'>
                    {isLoadingPublic
                      ? 'Carregando dados públicos...'
                      : 'Aguardando sincronização dos dados...'}
                  </p>
                  <Button
                    variant='outline'
                    className='mt-4 bg-blue-50 hover:bg-blue-100 border-blue-200'
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Recarregar página
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className='animate-fade-in'>
            {/* Barra de ferramentas */}
            <div className='bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div className='relative flex-grow w-full sm:w-auto'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400' />
                  <Input
                    placeholder='Buscar por número ou descrição...'
                    className='pl-10 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className='flex gap-3 w-full sm:w-auto'>
                  <Select
                    value={assetTypeFilter}
                    onValueChange={v => setAssetTypeFilter(v as any)}
                  >
                    <SelectTrigger className='w-full sm:w-[180px] h-12 border-gray-200'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Todos os Bens</SelectItem>
                      <SelectItem value='bem'>Bens Móveis</SelectItem>
                      <SelectItem value='imovel'>Imóveis</SelectItem>
                    </SelectContent>
                  </Select>
                  <Sheet
                    open={isFilterSheetOpen}
                    onOpenChange={setFilterSheetOpen}
                  >
                    <SheetTrigger asChild>
                      <Button
                        variant='outline'
                        className='h-12 border-gray-200 hover:bg-gray-50'
                      >
                        <Filter className='mr-2 h-4 w-4' /> Filtros
                      </Button>
                    </SheetTrigger>
                    <PublicAssetsFilterSheet
                      onApplyFilters={handleApplyFilters}
                      onClearFilters={handleClearFilters}
                      initialFilters={filters}
                      onClose={() => setFilterSheetOpen(false)}
                    />
                  </Sheet>
                  <Button
                    variant='outline'
                    onClick={startSync}
                    disabled={isSyncing}
                    className='h-12 border-gray-200 hover:bg-gray-50'
                  >
                    {isSyncing ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <RefreshCw className='mr-2 h-4 w-4' />
                    )}
                    Atualizar
                  </Button>
                </div>
              </div>
            </div>

            {/* Informações e ordenação */}
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
              <div className='flex items-center gap-4'>
                <p className='text-lg font-medium text-gray-700'>
                  {processedData.length} resultado(s) encontrado(s)
                </p>
                {lastSync && (
                  <p className='text-sm text-gray-500'>
                    Atualizado {formatRelativeDate(lastSync)}
                  </p>
                )}
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <span className='text-gray-600 font-medium'>Ordenar por:</span>
                <SortableHeader column='descricao' label='Descrição' />
                <SortableHeader
                  column='numero_patrimonio'
                  label='Nº Patrimônio'
                />
                <SortableHeader
                  column='data_aquisicao'
                  label='Data de Aquisição'
                />
              </div>
            </div>

            {/* Tabela de resultados */}
            <div className='space-y-4'>
              {paginatedData.length > 0 ? (
                <div className='bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100'>
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gradient-to-r from-blue-50 to-indigo-50'>
                        <tr>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Nº Patrimônio
                          </th>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Descrição do Bem
                          </th>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Setor Responsável
                          </th>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Local do Bem
                          </th>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Situação do Bem
                          </th>
                          <th className='px-6 py-4 text-left text-sm font-semibold text-blue-900 uppercase tracking-wider'>
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-100'>
                        {paginatedData.map(item => (
                          <tr
                            key={item.id}
                            className='hover:bg-blue-50 transition-colors duration-200'
                          >
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <span className='inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800'>
                                {item.numero_patrimonio}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                              {item.assetType === 'bem'
                                ? (item as Patrimonio).descricao ||
                                  (item as any).descricao ||
                                  'Sem descrição'
                                : (item as Imovel).denominacao ||
                                  'Sem denominação'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                              {(item as Patrimonio).setor_responsavel ||
                                'Não informado'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                              {(item as Patrimonio).local_objeto ||
                                'Não informado'}
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap'>
                              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                                {(item as Patrimonio).situacao_bem ||
                                  'Não informado'}
                              </span>
                            </td>
                            <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                              <Button
                                asChild
                                size='sm'
                                className='bg-blue-600 hover:bg-blue-700'
                              >
                                <Link
                                  to={
                                    item.assetType === 'bem'
                                      ? `/consulta-publica/${item.numero_patrimonio}`
                                      : `/consulta-publica/imovel/${item.id}`
                                  }
                                >
                                  Ver Detalhes
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className='col-span-full text-center py-16'>
                  <div className='bg-white rounded-xl shadow-lg p-12 border border-gray-100'>
                    <Archive className='h-20 w-20 mx-auto mb-6 opacity-50 text-gray-400' />
                    <h3 className='text-2xl font-semibold mb-4 text-gray-800'>
                      Nenhum bem encontrado
                    </h3>
                    <p className='text-lg text-gray-600 mb-6'>
                      {isLoadingPublic
                        ? 'Carregando dados públicos...'
                        : 'Não foram encontrados bens para este município.'}
                    </p>
                    {!isLoadingPublic && (
                      <Button
                        variant='outline'
                        className='bg-blue-50 hover:bg-blue-100 border-blue-200'
                        onClick={() => window.location.reload()}
                      >
                        <RefreshCw className='h-4 w-4 mr-2' />
                        Recarregar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Paginação */}
            <div className='mt-8'>
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
                  if (
                    direction === 'next' &&
                    pagination.pageIndex < pageCount
                  ) {
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
