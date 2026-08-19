// Gráfico de barras simples em SVG puro — sem dependência nova, só o
// necessário pra visualizar receita/custo mês a mês com o tema do app.
// Sem interatividade (tooltip) de propósito: é um retrato rápido, os
// valores exatos já aparecem na tabela de fechamento mensal.

type Point = { label: string; value: number; value2?: number };

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 56;
const PADDING_BOTTOM = 32;
const PADDING_TOP = 16;

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function BarChart({
  data,
  series2Label,
  series1Label,
}: {
  data: Point[];
  series1Label?: string;
  series2Label?: string;
}) {
  if (data.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 text-center text-neutral-500">
        Sem dados suficientes ainda pra desenhar o gráfico.
      </p>
    );
  }

  const hasSecondSeries = data.some((d) => d.value2 !== undefined);
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.value2 ?? 0)));
  const plotWidth = WIDTH - PADDING_LEFT - 12;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const groupWidth = plotWidth / data.length;
  const barWidth = hasSecondSeries
    ? Math.min(28, groupWidth / 2 - 6)
    : Math.min(40, groupWidth - 12);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      {(series1Label || series2Label) && (
        <div className="mb-2 flex items-center gap-4 text-xs text-neutral-400">
          {series1Label && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gold" />
              {series1Label}
            </span>
          )}
          {series2Label && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-neutral-500" />
              {series2Label}
            </span>
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img">
        {yTicks.map((t) => {
          const y = PADDING_TOP + plotHeight - (t / max) * plotHeight;
          return (
            <g key={t}>
              <line
                x1={PADDING_LEFT}
                x2={WIDTH - 12}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
              />
              <text x={PADDING_LEFT - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#8a8a8a">
                {money(t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const groupX = PADDING_LEFT + i * groupWidth;
          const h1 = (d.value / max) * plotHeight;
          const x1 = hasSecondSeries
            ? groupX + groupWidth / 2 - barWidth - 3
            : groupX + (groupWidth - barWidth) / 2;
          const h2 = ((d.value2 ?? 0) / max) * plotHeight;
          const x2 = groupX + groupWidth / 2 + 3;

          return (
            <g key={d.label}>
              <rect
                x={x1}
                y={PADDING_TOP + plotHeight - h1}
                width={barWidth}
                height={h1}
                rx={2}
                className="fill-gold"
              />
              {hasSecondSeries && (
                <rect
                  x={x2}
                  y={PADDING_TOP + plotHeight - h2}
                  width={barWidth}
                  height={h2}
                  rx={2}
                  className="fill-neutral-500"
                />
              )}
              <text
                x={groupX + groupWidth / 2}
                y={HEIGHT - PADDING_BOTTOM + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#8a8a8a"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
