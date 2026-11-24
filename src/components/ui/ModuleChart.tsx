'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from './primitives';

type ChartRow = Record<string, string | number | null>;
type ChartSeries = { key: string; label: string; color?: string };

export function ModuleChart({
  title,
  subtitle,
  data,
  xKey,
  series,
  type = 'bar',
  layout = 'horizontal',
  valueFormatter,
  className = '',
}: {
  title: string;
  subtitle: string;
  data: ChartRow[];
  xKey: string;
  series: ChartSeries[];
  type?: 'bar' | 'line';
  layout?: 'horizontal' | 'vertical';
  valueFormatter?: (value: number) => string;
  className?: string;
}) {
  const axisTick = { fill: 'var(--text-secondary)', fontSize: 11 };
  const tooltipStyle = {
    background: 'var(--bg-card)',
    borderColor: 'var(--border-subtle)',
    borderRadius: 14,
    color: 'var(--text-primary)',
  };
  const colors = ['var(--brand-accent)', 'var(--chart-secondary)', 'var(--status-info-fg)', 'var(--status-success-fg)'];
  const format = (value: number) => valueFormatter ? valueFormatter(value) : value.toLocaleString('en-KE');

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      {data.length ? (
        <div className="h-60 w-full" role="group" aria-label={`${title}. ${subtitle}`}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'line' ? (
              <LineChart accessibilityLayer data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={xKey} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value: number) => valueFormatter ? valueFormatter(value) : value.toLocaleString('en-KE')} tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => value == null ? 'Not enough data' : format(Number(value))} contentStyle={tooltipStyle} />
                {series.length > 1 && <Legend />}
                {series.map((item, index) => (
                  <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color ?? colors[index % colors.length]} strokeWidth={index ? 2 : 3} strokeDasharray={index ? '5 4' : undefined} connectNulls={false} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            ) : (
              <BarChart accessibilityLayer data={data} layout={layout === 'vertical' ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, bottom: layout === 'horizontal' ? 10 : 0, left: layout === 'vertical' ? 2 : -12 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} />
                {layout === 'vertical' ? (
                  <>
                    <XAxis type="number" tickFormatter={(value: number) => valueFormatter ? valueFormatter(value) : value.toLocaleString('en-KE')} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey={xKey} width={100} tick={axisTick} axisLine={false} tickLine={false} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey={xKey} tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value: number) => valueFormatter ? valueFormatter(value) : value.toLocaleString('en-KE')} tick={axisTick} axisLine={false} tickLine={false} />
                  </>
                )}
                <Tooltip cursor={{ fill: 'var(--bg-subtle)' }} formatter={(value) => format(Number(value))} contentStyle={tooltipStyle} />
                {series.length > 1 && <Legend />}
                {series.map((item, index) => (
                  <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color ?? colors[index % colors.length]} radius={layout === 'vertical' ? [0, 8, 8, 0] : [8, 8, 0, 0]} maxBarSize={32} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="ui-meta flex h-60 items-center justify-center text-center">Not enough recorded data for this period.</p>
      )}
    </ChartCard>
  );
}
