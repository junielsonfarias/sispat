import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { MultiSelect } from '@/components/ui/multi-select';
import { usePatrimonio } from '@/contexts/PatrimonioContext';
import { useSectors } from '@/contexts/SectorContext';
import { formatCurrency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import {
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
} from 'recharts';

const AnaliseSetor = () => {
  const { patrimonios } = usePatrimonio();
  const { sectors } = useSectors();
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const sectorOptions = useMemo(
    () => sectors.map(s => ({ value: s.name, label: s.name })),
    [sectors]
  );

  const sectorStats = useMemo(() => {
    return selectedSectors.map(sectorName => {
      const sectorPatrimonios = patrimonios.filter(
        p => p.setor_responsavel === sectorName
      );
      const totalValue = sectorPatrimonios.reduce(
        (acc, p) => acc + (parseFloat(p.valor_aquisicao) || 0),
        0
      );
      return {
        name: sectorName,
        totalBens: sectorPatrimonios.length,
        totalValue,
      };
    });
  }, [selectedSectors, patrimonios]);

  const radarData = useMemo(() => {
    const subjects = [
      'Qtd. Bens',
      'Valor Total',
      'Diversidade de Tipos',
      'Conservação Média',
    ];
    const data = subjects.map(subject => ({ subject }));

    sectorStats.forEach(stat => {
      const sectorPatrimonios = patrimonios.filter(
        p => p.setor_responsavel === stat.name
      );
      const diversity = new Set(sectorPatrimonios.map(p => p.tipo)).size;
      const conservationMap = {
        OTIMO: 5,
        BOM: 4,
        REGULAR: 3,
        RUIM: 2,
        PESSIMO: 1,
      };
      const totalConservation = sectorPatrimonios.reduce(
        (acc, p) => acc + (conservationMap[p.situacao_bem] || 0),
        0
      );
      const avgConservation =
        sectorPatrimonios.length > 0
          ? totalConservation / sectorPatrimonios.length
          : 0;

      data[0][stat.name] = stat.totalBens;
      data[1][stat.name] = stat.totalValue;
      data[2][stat.name] = diversity;
      data[3][stat.name] = avgConservation;
    });

    return data;
  }, [sectorStats, patrimonios]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100'>
      <div className='container mx-auto p-6'>
        {/* Header compacto com gradiente */}
        <div className='bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center'>
                <svg className='w-5 h-5 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' />
                </svg>
              </div>
              <div>
                <h1 className='text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent'>
                  Análise por Setor
                </h1>
                <p className='text-sm text-gray-600'>Compare indicadores entre diferentes setores</p>
              </div>
            </div>
            <div className='w-80'>
              <MultiSelect
                options={sectorOptions}
                selected={selectedSectors}
                onChange={setSelectedSectors}
                placeholder='Selecione os setores para comparar'
              />
            </div>
          </div>
        </div>
        {/* Cards de estatísticas compactos */}
        <div className='grid grid-cols-4 gap-3 mb-4'>
          {sectorStats.map((stat, index) => {
            const colors = [
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200', 
              'from-orange-50 to-orange-100 border-orange-200',
              'from-purple-50 to-purple-100 border-purple-200'
            ];
            const iconColors = [
              'bg-blue-500',
              'bg-green-500',
              'bg-orange-500', 
              'bg-purple-500'
            ];
            
            return (
              <div
                key={stat.name}
                className={`bg-gradient-to-br ${colors[index % 4]} rounded-lg shadow-sm border ${iconColors[index % 4].replace('bg-', 'border-')} p-4 hover:shadow-md transition-all duration-200`}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-xs font-medium text-gray-700 mb-1 truncate' title={stat.name}>
                      {stat.name}
                    </h3>
                    <p className='text-2xl font-bold text-gray-800'>
                      {stat.totalBens}
                    </p>
                    <p className='text-xs text-gray-600'>
                      {formatCurrency(stat.totalValue)}
                    </p>
                  </div>
                  <div className={`w-8 h-8 ${iconColors[index % 4]} rounded-md flex items-center justify-center`}>
                    <svg className='w-4 h-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Gráfico de Comparativo - Card moderno */}
        <div className='bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden'>
          <div className='bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200'>
            <h2 className='text-lg font-semibold text-gray-800'>Comparativo de Indicadores</h2>
            <p className='text-sm text-gray-600'>Análise comparativa entre setores selecionados</p>
          </div>
          <div className='p-6'>
            <ChartContainer config={{}} className='h-[350px] w-full'>
              <RadarChart cx='50%' cy='50%' outerRadius='80%' data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey='subject' />
                <PolarRadiusAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {selectedSectors.map((sectorName, index) => (
                  <Radar
                    key={sectorName}
                    name={sectorName}
                    dataKey={sectorName}
                    stroke={`hsl(var(--chart-${(index % 5) + 1}))`}
                    fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                    fillOpacity={0.6}
                  />
                ))}
              </RadarChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnaliseSetor;
