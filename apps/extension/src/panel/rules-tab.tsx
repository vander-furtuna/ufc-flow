import type { CurriculumImportV1 } from '@ufc-flow/contracts'

type Curriculum = CurriculumImportV1['curriculum']

const hours = (value: number | null) => (value === null ? '—' : `${value} h`)

// Regras da EC: cargas exigidas, prazos e limites, como no cabeçalho do SIGAA
export function RulesTab({ curriculum }: { curriculum: Curriculum }) {
  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: 'Identificação',
      rows: [
        ['Código da estrutura', curriculum.code],
        ['Entrada em vigor', curriculum.effectiveTerm],
        ['Matriz curricular', curriculum.matrixName],
        ['Unidade', curriculum.unitName ?? '—'],
        ['Município', curriculum.city],
      ],
    },
    {
      title: 'Cargas exigidas',
      rows: [
        ['Total mínima', hours(curriculum.minTotalHours)],
        ['Total máxima', hours(curriculum.maxTotalHours)],
        ['Obrigatória', hours(curriculum.mandatoryHours)],
        ['Optativa mínima', hours(curriculum.optativeHours)],
        ['Extensão', hours(curriculum.extensionHours)],
        [
          'Atividades acadêmicas específicas',
          hours(curriculum.specificActivityHours),
        ],
        ['Optativas livres (máximo)', hours(curriculum.maxFreeOptativeHours)],
      ],
    },
    {
      title: 'Prazos e carga por período',
      rows: [
        [
          'Períodos para concluir',
          `${curriculum.minPeriods} mínimo · ${curriculum.avgPeriods} médio · ${curriculum.maxPeriods} máximo`,
        ],
        [
          'Carga por período',
          `${curriculum.periodMinHours} h mínima · ${curriculum.periodAvgHours} h média · ${curriculum.periodMaxHours} h máxima`,
        ],
        [
          'Ênfases',
          curriculum.minEmphases === null
            ? 'Sem exigências'
            : curriculum.maxEmphases === 0
              ? 'Sem ênfases'
              : `${curriculum.minEmphases} exigida(s) · ${curriculum.maxEmphases} permitida(s)`,
        ],
      ],
    },
  ]

  return (
    <div className="grid flex-1 auto-rows-min gap-4 overflow-y-auto p-6 lg:grid-cols-3">
      {groups.map((group) => (
        <section
          key={group.title}
          className="border-border flex flex-col gap-3 rounded-2xl border p-4"
        >
          <h3 className="font-clash text-base font-semibold">{group.title}</h3>
          <dl className="flex flex-col gap-2 text-sm">
            {group.rows.map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
