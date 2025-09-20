import { useMemo } from 'react';
import { Pie, PieChart, Cell, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { SafeChart } from '@/components/ui/safe-chart';
import { usePatrimonio } from '@/contexts/PatrimonioContext';

export const TypeChartWidget = () => {
  const { patrimonios } = usePatrimonio();

  const typeChartData = useMemo(() => {
    const typeDistribution = patrimonios.reduce(
      (acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const chartColors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    return Object.entries(typeDistribution).map(([name, value], index) => ({
      name,
      value,
      fill: chartColors[index % chartColors.length],
    }));
  }, [patrimonios]);

  return (
    <SafeChart>
      <ChartContainer config={{}} className='h-[300px] w-full'>
        <PieChart>
          <Tooltip content={<ChartTooltipContent />} />
          <Pie
            data={typeChartData}
            dataKey='value'
            nameKey='name'
            cx='50%'
            cy='50%'
            outerRadius={80}
          >
            {typeChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ChartContainer>
    </SafeChart>
  );
};
