'use client'

import type {
  ChangeCurriculumInput,
  CloseSubjectRecordInput,
  EnrollmentInput,
  SubjectRecordInput,
} from '@ufc-flow/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useSession } from '@/lib/auth/use-session'

import {
  addRecordAction,
  changeCurriculumAction,
  closeRecordAction,
  createEnrollmentAction,
  deleteRecordAction,
  getSummaryAction,
  listEnrollmentsAction,
  listRecordsAction,
  type AcademicResult,
} from './academic-actions'

export const ACADEMIC_KEY = ['academic'] as const

// Erro da API com o código, para a tela escolher a mensagem
export class AcademicError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

const unwrap = <T>(result: AcademicResult<T>): T => {
  if (!result.ok) {
    throw new AcademicError(
      result.problem.code,
      result.problem.detail ?? 'Não foi possível concluir. Tente de novo.',
    )
  }
  return result.data
}

export function useEnrollments() {
  const { data: user } = useSession()
  return useQuery({
    queryKey: [...ACADEMIC_KEY, 'enrollments'],
    queryFn: async () => unwrap(await listEnrollmentsAction()),
    enabled: Boolean(user),
    staleTime: 60_000,
  })
}

// A matrícula atual, ou null quando a pessoa ainda não cadastrou
export function useCurrentEnrollment() {
  const query = useEnrollments()
  return {
    ...query,
    enrollment: query.data?.find((item) => item.isCurrent) ?? null,
  }
}

export function useAcademicSummary(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: [...ACADEMIC_KEY, 'summary', enrollmentId],
    queryFn: async () => unwrap(await getSummaryAction(enrollmentId!)),
    enabled: Boolean(enrollmentId),
  })
}

export function useRecords(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: [...ACADEMIC_KEY, 'records', enrollmentId],
    queryFn: async () => unwrap(await listRecordsAction(enrollmentId!)),
    enabled: Boolean(enrollmentId),
  })
}

// Toda escrita invalida o que a Minha área lê: o progresso é recalculado
function useAcademicMutation<TInput, TOutput>(
  run: (input: TInput) => Promise<AcademicResult<TOutput>>,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: TInput) => unwrap(await run(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACADEMIC_KEY }),
  })
}

export const useCreateEnrollment = () =>
  useAcademicMutation((input: EnrollmentInput) => createEnrollmentAction(input))

export const useChangeCurriculum = () =>
  useAcademicMutation(
    (input: { enrollmentId: string } & ChangeCurriculumInput) =>
      changeCurriculumAction(input.enrollmentId, {
        curriculumSlug: input.curriculumSlug,
      }),
  )

export const useAddRecord = () =>
  useAcademicMutation(
    (input: { enrollmentId: string; record: SubjectRecordInput }) =>
      addRecordAction(input.enrollmentId, input.record),
  )

export const useCloseRecord = () =>
  useAcademicMutation((input: { recordId: string } & CloseSubjectRecordInput) =>
    closeRecordAction(input.recordId, {
      status: input.status,
      grade: input.grade,
    }),
  )

export const useDeleteRecord = () =>
  useAcademicMutation((recordId: string) => deleteRecordAction(recordId))
