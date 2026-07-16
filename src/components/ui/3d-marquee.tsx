'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { capitalizeWords } from '@/utils/capitalize-words'
import { getSubjectStyle } from '@/utils/get-subject-style'

export interface MockSubject {
  code: string
  name: string
  nature: string
  colors?: string[]
}

const MOCK_SUBJECTS: MockSubject[] = [
  // New leftmost Column
  {
    code: 'MOCK01',
    name: 'GEOMETRIA ANALÍTICA',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK02',
    name: 'ÁLGEBRA VETORIAL',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK03',
    name: 'QUÍMICA GERAL',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK04',
    name: 'MATEMÁTICA BÁSICA',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK05',
    name: 'CÁLCULO DIFERENCIAL E INTEGRAL III',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK06',
    name: 'EQUAÇÕES DIFERENCIAIS ORDINÁRIAS',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK07',
    name: 'OTIMIZAÇÃO LINEAR',
    nature: 'OPTATIVA',
    colors: ['#ec4899'],
  },
  {
    code: 'MOCK08',
    name: 'TEORIA DA COMPUTAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK09',
    name: 'CIRCUITOS ELÉTRICOS II',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK0A',
    name: 'SISTEMAS DE CONTROLE I',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK0B',
    name: 'LABORATÓRIO DE PROGRAMAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK0C',
    name: 'TÓPICOS EM COMPUTAÇÃO MÓVEL',
    nature: 'OPTATIVA',
    colors: ['#3b82f6'],
  },

  // Column 1
  {
    code: 'MOCK11',
    name: 'CÁLCULO DIFERENCIAL E INTEGRAL I',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK12',
    name: 'MATEMÁTICA DISCRETA PARA COMPUTAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK13',
    name: 'PROGRAMAÇÃO COMPUTACIONAL',
    nature: 'OBRIGATÓRIA',
  },
  { code: 'MOCK14', name: 'INTRODUÇÃO A ENGENHARIA', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK15', name: 'FÍSICA GERAL I', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK16', name: 'TÉCNICAS DE PROGRAMAÇÃO', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK17', name: 'ÁLGEBRA LINEAR', nature: 'OBRIGATÓRIA' },
  {
    code: 'MOCK18',
    name: 'CÁLCULO DIFERENCIAL E INTEGRAL II',
    nature: 'OBRIGATÓRIA',
  },
  { code: 'MOCK19', name: 'DESENHO PARA ENGENHARIA', nature: 'OBRIGATÓRIA' },
  {
    code: 'MOCK1A',
    name: 'ÁLGEBRA LINEAR PARA COMPUTAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK1B',
    name: 'LÓGICA MATEMÁTICA',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK1C',
    name: 'COMPUTAÇÃO E SOCIEDADE',
    nature: 'OBRIGATÓRIA',
  },

  // Column 2
  {
    code: 'MOCK21',
    name: 'PROBABILIDADE E ESTATÍSTICA',
    nature: 'OBRIGATÓRIA',
  },
  { code: 'MOCK22', name: 'ESTRUTURAS DE DADOS', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK23', name: 'CÁLCULO VETORIAL', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK24', name: 'FÍSICA GERAL II', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK25', name: 'FÍSICA GERAL III', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK26', name: 'MÉTODOS NUMÉRICOS', nature: 'OBRIGATÓRIA' },
  {
    code: 'MOCK27',
    name: 'SERIES E EQUAÇÕES DIFERENCIAIS',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK28',
    name: 'PARADIGMAS DE LINGUAGEM DE PROGRAMAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK29',
    name: 'ARQUITETURA E ORGANIZACAO DE COMPUTADORES',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK2A',
    name: 'ÉTICA E LEGISLAÇÃO EM COMPUTAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK2B',
    name: 'ENGENHARIA ECONÔMICA',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK2C',
    name: 'PROCESSAMENTO DE SINAIS',
    nature: 'OBRIGATÓRIA',
  },

  // Column 3
  { code: 'MOCK31', name: 'SISTEMAS OPERACIONAIS', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK32', name: 'ENGENHARIA DE SOFTWARE', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK33', name: 'REDES DE COMPUTADORES', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK34', name: 'BANCO DE DADOS', nature: 'OBRIGATÓRIA' },
  {
    code: 'MOCK35',
    name: 'INTELIGÊNCIA COMPUTACIONAL',
    nature: 'OBRIGATÓRIA',
  },
  { code: 'MOCK36', name: 'CIRCUITOS ELÉTRICOS I', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK37', name: 'ELETRÔNICA DIGITAL', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK38', name: 'MICROPROCESSADORES', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK39', name: 'SOFTWARE EM TEMPO REAL', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK3A', name: 'FÍSICA EXPERIMENTAL I', nature: 'OBRIGATÓRIA' },
  { code: 'MOCK3B', name: 'FÍSICA EXPERIMENTAL II', nature: 'OBRIGATÓRIA' },
  {
    code: 'MOCK3C',
    name: 'CIÊNCIAS, TECNOLOGIA E SOCIEDADE',
    nature: 'OBRIGATÓRIA',
  },

  // Column 4
  {
    code: 'MOCK41',
    name: 'TEORIA DOS AUTOMATOS E LINGUAGENS FORMAIS',
    nature: 'OPTATIVA',
    colors: ['#10b981'],
  },
  {
    code: 'MOCK42',
    name: 'PESQUISA E ORDENACAO DE DADOS',
    nature: 'OPTATIVA',
    colors: ['#6366f1'],
  },
  {
    code: 'MOCK43',
    name: 'COMPUTAÇÃO GRÁFICA',
    nature: 'OPTATIVA',
    colors: ['#ec4899'],
  },
  {
    code: 'MOCK44',
    name: 'SISTEMAS DE GERENCIAMENTO DE BANCO DE DADOS',
    nature: 'OPTATIVA',
    colors: ['#06b6d4'],
  },
  {
    code: 'MOCK45',
    name: 'CONSTRUÇÃO DE COMPILADORES',
    nature: 'OPTATIVA',
    colors: ['#f59e0b'],
  },
  {
    code: 'MOCK46',
    name: 'SISTEMAS DISTRIBUÍDOS',
    nature: 'OPTATIVA',
    colors: ['#8b5cf6'],
  },
  {
    code: 'MOCK47',
    name: 'TECNOLOGIAS WEB',
    nature: 'OPTATIVA',
    colors: ['#3b82f6'],
  },
  {
    code: 'MOCK48',
    name: 'QUALIDADE DE SOFTWARE',
    nature: 'OPTATIVA',
    colors: ['#10b981'],
  },
  {
    code: 'MOCK49',
    name: 'GERÊNCIA E CONFIGURACAO DE SOFTWARE',
    nature: 'OPTATIVA',
    colors: ['#ef4444'],
  },
  {
    code: 'MOCK4A',
    name: 'COMPUTAÇÃO DE ALTO DESEMPENHO',
    nature: 'OPTATIVA',
    colors: ['#10b981'],
  },
  {
    code: 'MOCK4B',
    name: 'SISTEMAS RECONFIGURÁVEIS',
    nature: 'OPTATIVA',
    colors: ['#10b981'],
  },
  {
    code: 'MOCK4C',
    name: 'OTIMIZAÇÃO EM GRAFOS',
    nature: 'OPTATIVA',
    colors: ['#06b6d4'],
  },

  // Column 5
  {
    code: 'MOCK51',
    name: 'ENGENHARIA AMBIENTAL',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK52',
    name: 'FUNDAMENTOS DE ADMINISTRAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK53',
    name: 'LÓGICA PARA COMPUTAÇÃO',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK54',
    name: 'TEORIA DOS GRAFOS',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK55',
    name: 'INTERFACE HUMANO-COMPUTADOR',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK56',
    name: 'EMPREENDEDORISNE',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK57',
    name: 'PROJETO DE GRADUAÇÃO I',
    nature: 'TCC',
  },
  {
    code: 'MOCK58',
    name: 'PROJETO DE GRADUAÇÃO II',
    nature: 'TCC',
  },
  {
    code: 'MOCK59',
    name: 'SEMINÁRIO DE ESTÁGIO',
    nature: 'ESTÁGIO',
  },
  {
    code: 'MOCK5A',
    name: 'SEMINÁRIO DE MONOGRAFIA',
    nature: 'TCC',
  },
  {
    code: 'MOCK5B',
    name: 'AVALIAÇÃO DE DESEMPENHO',
    nature: 'OPTATIVA',
    colors: ['#8b5cf6'],
  },
  {
    code: 'MOCK5C',
    name: 'ADMINISTRAÇÃO DE SISTEMAS',
    nature: 'OPTATIVA',
    colors: ['#6366f1'],
  },

  // Column 6
  {
    code: 'MOCK61',
    name: 'PROCESSAMENTO DIGITAL DE IMAGENS',
    nature: 'OPTATIVA',
    colors: ['#6366f1'],
  },
  {
    code: 'MOCK62',
    name: 'SISTEMAS EMBARCADOS',
    nature: 'OPTATIVA',
    colors: ['#10b981'],
  },
  {
    code: 'MOCK63',
    name: 'DESENHOS DE COMPONENTES DE SOFTWARE',
    nature: 'OPTATIVA',
    colors: ['#ec4899'],
  },
  {
    code: 'MOCK64',
    name: 'ROBÓTICA MÓVEL',
    nature: 'OPTATIVA',
    colors: ['#06b6d4'],
  },
  {
    code: 'MOCK65',
    name: 'MINERAÇÃO DE DADOS',
    nature: 'OPTATIVA',
    colors: ['#3b82f6'],
  },
  {
    code: 'MOCK66',
    name: 'PROCESSAMENTO DE LINGUAGEM NATURAL',
    nature: 'OPTATIVA',
    colors: ['#ec4899'],
  },
  {
    code: 'MOCK67',
    name: 'VERIFICAÇÃO DE SOFTWARE',
    nature: 'OPTATIVA',
    colors: ['#ef4444'],
  },
  {
    code: 'MOCK68',
    name: 'GERENCIAMENTO DE PROJETOS',
    nature: 'OPTATIVA',
    colors: ['#f59e0b'],
  },
  {
    code: 'MOCK69',
    name: 'SEGURANÇA DE REDES',
    nature: 'OPTATIVA',
    colors: ['#ec4899'],
  },
  {
    code: 'MOCK6A',
    name: 'TÓPICOS ESPECIAIS EM ENGENHARIA DE SOFTWARE',
    nature: 'OPTATIVA',
    colors: ['#ef4444'],
  },
  {
    code: 'MOCK6B',
    name: 'COMPUTADORES E SOCIEDADE',
    nature: 'OBRIGATÓRIA',
  },
  {
    code: 'MOCK6C',
    name: 'ESTÁGIO SUPERVISIONADO',
    nature: 'ESTÁGIO',
  },
]

export function MockSubjectCard({ subject }: { subject: MockSubject }) {
  const name = capitalizeWords(subject.name)
  const backgroundStyle = getSubjectStyle(subject.colors, subject.nature)

  return (
    <div className="group ring-border center before:bg-background/70 dark:before:bg-background/40 relative flex h-24 w-[200px] shrink-0 flex-col gap-1 rounded-lg bg-transparent px-4 text-center ring-1 transition-all duration-300 before:absolute before:-z-20 before:size-full before:rounded-lg before:content-[''] after:absolute after:right-0 after:-z-10 after:size-full after:rounded-lg after:bg-black after:opacity-0 after:transition-all after:duration-300 after:content-[''] hover:shadow-lg hover:ring-0 active:scale-95 dark:ring-slate-700 dark:hover:after:opacity-15">
      <span className="text-accent-foreground line-clamp-3 text-[13px] font-medium drop-shadow-sm select-none">
        {name}
      </span>

      {/* Mock SubjectBar */}
      <div
        className="ease-smooth absolute bottom-2 -z-10 h-2 w-8 rounded-[5rem] transition-all duration-700 group-hover:bottom-0 group-hover:h-full group-hover:w-full group-hover:rounded-lg"
        style={{
          background: backgroundStyle,
        }}
      />
      <div
        className="ease-smooth absolute bottom-2 -z-15 h-2 w-8 rounded-[5rem] opacity-70 blur-lg transition-all duration-700 group-hover:bottom-0 group-hover:h-full group-hover:w-full group-hover:rounded-lg"
        style={{
          background: backgroundStyle,
        }}
      />
    </div>
  )
}

export const ThreeDMarquee = ({
  className,
  subjects = MOCK_SUBJECTS,
}: {
  className?: string
  subjects?: MockSubject[]
}) => {
  // Split the subjects array into 7 equal parts
  const chunkSize = Math.ceil(subjects.length / 7)
  const chunks = Array.from({ length: 7 }, (_, colIndex) => {
    const start = colIndex * chunkSize
    return subjects.slice(start, start + chunkSize)
  })

  return (
    <div
      className={cn(
        'absolute inset-0 block overflow-hidden select-none',
        className,
      )}
    >
      <div className="flex size-full items-center justify-center">
        <div className="relative h-[1800px] w-[1600px] shrink-0 scale-75 xl:scale-100">
          <div
            style={{
              transform: 'rotateX(55deg) rotateY(0deg) rotateZ(-45deg)',
            }}
            className="absolute top-[-100px] grid size-full origin-center grid-cols-7 gap-8 transform-3d"
          >
            {chunks.map((subarray, colIndex) => (
              <motion.div
                animate={{ y: colIndex % 2 === 0 ? [100, -300] : [-300, 100] }}
                transition={{
                  duration: colIndex % 2 === 0 ? 30 : 35,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
                key={colIndex + 'marquee'}
                className="flex flex-col items-start gap-8"
              >
                <GridLineVertical className="-left-4" offset="80px" />
                {[...subarray, ...subarray].map((subject, index) => (
                  <div className="relative" key={`${subject.code}-${index}`}>
                    <GridLineHorizontal className="-top-4" offset="20px" />
                    <motion.div
                      whileHover={{
                        y: -8,
                        scale: 1.05,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: 'easeInOut',
                      }}
                    >
                      <MockSubjectCard subject={subject} />
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const GridLineHorizontal = ({
  className,
  offset,
}: {
  className?: string
  offset?: string
}) => {
  return (
    <div
      style={
        {
          '--background': 'var(--background, #ffffff)',
          '--color': 'rgba(0, 0, 0, 0.15)',
          '--height': '1px',
          '--width': '5px',
          '--fade-stop': '90%',
          '--offset': offset || '20px',
          '--color-dark': 'rgba(255, 255, 255, 0.15)',
          maskComposite: 'exclude',
        } as React.CSSProperties
      }
      className={cn(
        'absolute left-[calc(var(--offset)/2*-1)] h-[var(--height)] w-[calc(100%+var(--offset))]',
        'bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        'dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]',
        className,
      )}
    ></div>
  )
}

const GridLineVertical = ({
  className,
  offset,
}: {
  className?: string
  offset?: string
}) => {
  return (
    <div
      style={
        {
          '--background': 'var(--background, #ffffff)',
          '--color': 'rgba(0, 0, 0, 0.15)',
          '--height': '5px',
          '--width': '1px',
          '--fade-stop': '90%',
          '--offset': offset || '80px',
          '--color-dark': 'rgba(255, 255, 255, 0.15)',
          maskComposite: 'exclude',
        } as React.CSSProperties
      }
      className={cn(
        'absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]',
        'bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        'dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]',
        className,
      )}
    ></div>
  )
}
