import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PnLPoint } from '../../types/trade';
import { formatCurrency, formatPrice } from '../../utils/formatters';

interface PnLDiagramProps {
  data: PnLPoint[];
  underlyingPrice: number;
  breakevens: number[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-terminal-surface border border-terminal-border rounded p-2 text-xs shadow-xl">
      <p className="text-terminal-dim mb-1">Price: <span className="text-terminal-text">{formatPrice(label)}</span></p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function PnLDiagram({ data, underlyingPrice, breakevens }: PnLDiagramProps) {
  const hasDTE = data.some((d) => d.pnlAtDTE !== undefined);

  // Find domain for Y axis
  const allPnl = data.flatMap((d) => [d.pnl, d.pnlAtDTE ?? d.pnl]);
  const minY = Math.min(...allPnl);
  const maxY = Math.max(...allPnl);
  const padding = Math.max(50, (maxY - minY) * 0.1);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis
          dataKey="price"
          tickFormatter={(v) => `$${v.toFixed(0)}`}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e1e2e' }}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, 0)}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          domain={[minY - padding, maxY + padding]}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />

        {hasDTE && (
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#64748b', paddingTop: '8px' }}
          />
        )}

        {/* Zero line */}
        <ReferenceLine y={0} stroke="#2a2a3e" strokeWidth={1.5} />

        {/* Current price */}
        <ReferenceLine
          x={underlyingPrice}
          stroke="#3b82f6"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: 'Current', position: 'top', fontSize: 10, fill: '#3b82f6' }}
        />

        {/* Breakevens */}
        {breakevens.map((be) => (
          <ReferenceLine
            key={be}
            x={be}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: `BE $${be}`, position: 'insideTopRight', fontSize: 9, fill: '#f59e0b' }}
          />
        ))}

        {/* At DTE curve */}
        {hasDTE && (
          <Area
            type="monotone"
            dataKey="pnlAtDTE"
            name="At DTE"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray="5 3"
            dot={false}
          />
        )}

        {/* Expiration P&L */}
        <Area
          type="monotone"
          dataKey="pnl"
          name="At Expiry"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#pnlGradient)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
