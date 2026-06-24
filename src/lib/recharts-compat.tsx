/* eslint-disable @typescript-eslint/no-explicit-any */
// Compat shim recharts × React 19.
//
// recharts 2.x expõe seus componentes como classes cujo tipo NÃO satisfaz o
// checador de "elemento JSX válido" do React 19 (erros TS2786/TS2607 —
// "'XAxis' cannot be used as a JSX component ... missing props, state, ..."). Não
// há correção oficial no recharts 2.x para React 19.
//
// Centralizamos o workaround aqui: re-exportamos os componentes contornando a
// checagem de elemento JSX, em vez de espalhar `// @ts-expect-error` por ~69
// pontos de uso. O `any` é DELIBERADO e isolado a este shim — não vaza para a
// lógica de negócio. Quando o recharts publicar tipos compatíveis com React 19,
// basta apontar os imports de volta para 'recharts' e remover este arquivo.
import * as RC from 'recharts'
import type { FC } from 'react'

const asJsx = <T,>(c: T) => c as unknown as FC<any>

export const Area = asJsx(RC.Area)
export const AreaChart = asJsx(RC.AreaChart)
export const Bar = asJsx(RC.Bar)
export const BarChart = asJsx(RC.BarChart)
export const CartesianGrid = asJsx(RC.CartesianGrid)
export const Cell = asJsx(RC.Cell)
export const ComposedChart = asJsx(RC.ComposedChart)
export const Legend = asJsx(RC.Legend)
export const Line = asJsx(RC.Line)
export const Pie = asJsx(RC.Pie)
export const PieChart = asJsx(RC.PieChart)
export const PolarAngleAxis = asJsx(RC.PolarAngleAxis)
export const PolarGrid = asJsx(RC.PolarGrid)
export const PolarRadiusAxis = asJsx(RC.PolarRadiusAxis)
export const Radar = asJsx(RC.Radar)
export const RadarChart = asJsx(RC.RadarChart)
export const ResponsiveContainer = asJsx(RC.ResponsiveContainer)
export const Tooltip = asJsx(RC.Tooltip)
export const XAxis = asJsx(RC.XAxis)
export const YAxis = asJsx(RC.YAxis)
