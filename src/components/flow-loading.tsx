import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

type FlowLoadingProps = ComponentProps<'svg'>

export function FlowLoading({ className, ...props }: FlowLoadingProps) {
  return (
    <svg
      viewBox="0 0 640 641"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-auto', className)}
      {...props}
    >
      <defs>
        <mask id="grid-logo-mask">
          <path
            d="M0 76.03C0 34.0398 34.0398 0 76.03 0H228.1C270.09 0 304.13 34.0398 304.13 76.03V228.1C304.13 270.09 270.09 304.13 228.1 304.13H76.03C34.0398 304.13 0 270.09 0 228.1V76.03Z"
            fill="white"
          />
          <path
            d="M335.75 76.03C335.75 34.0398 369.79 0 411.78 0H563.85C605.84 0 639.88 34.0398 639.88 76.03V228.1C639.88 270.09 605.84 304.13 563.85 304.13H411.78C369.79 304.13 335.75 270.09 335.75 228.1V76.03Z"
            fill="white"
          />
          <path
            d="M0 412.16C0 370.17 34.0398 336.13 76.03 336.13H228.1C270.09 336.13 304.13 370.17 304.13 412.16V564.23C304.13 606.22 270.09 640.26 228.1 640.26H76.03C34.0398 640.26 0 606.22 0 564.23V412.16Z"
            fill="white"
          />
          <path
            d="M335.75 412.16C335.75 370.17 369.79 336.13 411.78 336.13H563.85C605.84 336.13 639.88 370.17 639.88 412.16V564.23C639.88 606.22 605.84 640.26 563.85 640.26H411.78C369.79 640.26 335.75 606.22 335.75 564.23V412.16Z"
            fill="white"
          />
        </mask>
      </defs>

      <g mask="url(#grid-logo-mask)">
        <foreignObject x="0" y="0" width="640" height="641">
          <div className="bg-accent h-full w-full">
            <div
              className="animate-slow-spin h-full w-full"
              style={{
                background: `conic-gradient(from 0deg, #22D3EE, #4ADE80, #FDC700)`,
                filter: 'blur(100px)',
                transformOrigin: 'center center',
              }}
            />
          </div>
        </foreignObject>
      </g>
    </svg>
  )
}
