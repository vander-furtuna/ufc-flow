import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'

import type { Executor } from '../../../../shared/infrastructure/persistence/drizzle-helpers'
import {
  studentActivityRecords,
  studentEnrollments,
  studentSubjectRecords,
} from '../../../academic-record/infrastructure/persistence/academic-record.schema'
import {
  courses,
  subjects,
} from '../../../catalog/infrastructure/persistence/catalog.schema'
import {
  evaluationCriteria,
  subjectEvaluationScores,
  subjectEvaluations,
} from '../../../evaluation/infrastructure/persistence/evaluation.schema'
import { files } from '../../../files/infrastructure/persistence/files.schema'
import { ACCOUNT_DELETED_REASON } from '../../../forum/domain/message'
import {
  messageLikes,
  messageReports,
  messageSubjectMentions,
  messages,
} from '../../../forum/infrastructure/persistence/forum.schema'
import { posts } from '../../../hub/infrastructure/persistence/hub.schema'
import { notifications } from '../../../notifications/infrastructure/persistence/notifications.schema'
import {
  scheduleItems,
  schedules,
} from '../../../planning/infrastructure/persistence/planning.schema'
import type { PersonalDataStore } from '../../domain/ports'
import {
  courseModerators,
  moderatorRequests,
  sessions,
  userConsents,
  userPreferences,
  users,
} from './identity.schema'

// LGPD: lê e apaga os dados da pessoa em todos os módulos. Fica com a
// identidade porque a conta é dela; as tabelas dos outros módulos entram
// só aqui, na infraestrutura.
export function personalDataStore(db: Executor): PersonalDataStore {
  const enrollmentIds = (userId: string) =>
    db
      .select({ id: studentEnrollments.id })
      .from(studentEnrollments)
      .where(eq(studentEnrollments.userId, userId))
  const messageIds = (userId: string) =>
    db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.authorId, userId))

  return {
    async collect(userId) {
      const userSchedules = await db
        .select()
        .from(schedules)
        .where(eq(schedules.userId, userId))
        .orderBy(asc(schedules.position))
      const items =
        userSchedules.length === 0
          ? []
          : await db
              .select()
              .from(scheduleItems)
              .where(
                inArray(
                  scheduleItems.scheduleId,
                  userSchedules.map((schedule) => schedule.id),
                ),
              )
      const evaluations = await db
        .select({
          id: subjectEvaluations.id,
          subjectCode: subjects.code,
          subjectName: subjects.name,
          createdAt: subjectEvaluations.createdAt,
          updatedAt: subjectEvaluations.updatedAt,
        })
        .from(subjectEvaluations)
        .innerJoin(subjects, eq(subjects.id, subjectEvaluations.subjectId))
        .where(eq(subjectEvaluations.userId, userId))
      const scores =
        evaluations.length === 0
          ? []
          : await db
              .select({
                evaluationId: subjectEvaluationScores.evaluationId,
                criterion: evaluationCriteria.key,
                score: subjectEvaluationScores.score,
              })
              .from(subjectEvaluationScores)
              .innerJoin(
                evaluationCriteria,
                eq(evaluationCriteria.id, subjectEvaluationScores.criterionId),
              )
              .where(
                inArray(
                  subjectEvaluationScores.evaluationId,
                  evaluations.map((evaluation) => evaluation.id),
                ),
              )

      return {
        consents: await db
          .select({
            document: userConsents.document,
            version: userConsents.version,
            acceptedAt: userConsents.acceptedAt,
          })
          .from(userConsents)
          .where(eq(userConsents.userId, userId))
          .orderBy(asc(userConsents.acceptedAt)),
        // Sem o hash do token de renovação
        sessions: await db
          .select({
            createdAt: sessions.createdAt,
            expiresAt: sessions.expiresAt,
            revokedAt: sessions.revokedAt,
            ip: sessions.ip,
            userAgent: sessions.userAgent,
          })
          .from(sessions)
          .where(eq(sessions.userId, userId))
          .orderBy(asc(sessions.createdAt)),
        preferences: await db
          .select({
            key: userPreferences.key,
            value: userPreferences.value,
            updatedAt: userPreferences.updatedAt,
          })
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId)),
        moderatorRequests: await db
          .select({
            course: courses.name,
            justification: moderatorRequests.justification,
            status: moderatorRequests.status,
            reviewNote: moderatorRequests.reviewNote,
            reviewedAt: moderatorRequests.reviewedAt,
            createdAt: moderatorRequests.createdAt,
          })
          .from(moderatorRequests)
          .innerJoin(courses, eq(courses.id, moderatorRequests.courseId))
          .where(eq(moderatorRequests.userId, userId)),
        moderatedCourses: await db
          .select({
            course: courses.name,
            grantedAt: courseModerators.grantedAt,
            revokedAt: courseModerators.revokedAt,
          })
          .from(courseModerators)
          .innerJoin(courses, eq(courses.id, courseModerators.courseId))
          .where(eq(courseModerators.userId, userId)),
        enrollments: await db
          .select({
            id: studentEnrollments.id,
            course: courses.name,
            registrationNumber: studentEnrollments.registrationNumber,
            status: studentEnrollments.status,
            isCurrent: studentEnrollments.isCurrent,
            entryTerm: studentEnrollments.entryTerm,
            createdAt: studentEnrollments.createdAt,
          })
          .from(studentEnrollments)
          .innerJoin(courses, eq(courses.id, studentEnrollments.courseId))
          .where(eq(studentEnrollments.userId, userId)),
        subjectRecords: await db
          .select({
            enrollmentId: studentSubjectRecords.enrollmentId,
            subjectCode: subjects.code,
            subjectName: subjects.name,
            termCode: studentSubjectRecords.termCode,
            status: studentSubjectRecords.status,
            grade: studentSubjectRecords.grade,
            originNote: studentSubjectRecords.originNote,
            createdAt: studentSubjectRecords.createdAt,
          })
          .from(studentSubjectRecords)
          .innerJoin(subjects, eq(subjects.id, studentSubjectRecords.subjectId))
          .where(
            inArray(studentSubjectRecords.enrollmentId, enrollmentIds(userId)),
          )
          .orderBy(asc(studentSubjectRecords.termCode)),
        activityRecords: await db
          .select({
            enrollmentId: studentActivityRecords.enrollmentId,
            kind: studentActivityRecords.kind,
            title: studentActivityRecords.title,
            description: studentActivityRecords.description,
            institution: studentActivityRecords.institution,
            hours: studentActivityRecords.hours,
            startedOn: studentActivityRecords.startedOn,
            endedOn: studentActivityRecords.endedOn,
            certificateFileId: studentActivityRecords.certificateFileId,
            createdAt: studentActivityRecords.createdAt,
          })
          .from(studentActivityRecords)
          .where(
            inArray(studentActivityRecords.enrollmentId, enrollmentIds(userId)),
          ),
        schedules: userSchedules.map((schedule) => ({
          name: schedule.name,
          position: schedule.position,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
          items: items
            .filter((item) => item.scheduleId === schedule.id)
            .map(({ subjectCode, color, addedAt }) => ({
              subjectCode,
              color,
              addedAt,
            })),
        })),
        // Só os metadados; o conteúdo se baixa por /v1/files/{id}
        files: await db
          .select({
            id: files.id,
            purpose: files.purpose,
            originalName: files.originalName,
            mimeType: files.mimeType,
            sizeBytes: files.sizeBytes,
            status: files.status,
            createdAt: files.createdAt,
          })
          .from(files)
          .where(eq(files.ownerId, userId)),
        hubPosts: await db
          .select({
            id: posts.id,
            type: posts.type,
            title: posts.title,
            summary: posts.summary,
            bodyMd: posts.bodyMd,
            status: posts.status,
            publishedAt: posts.publishedAt,
          })
          .from(posts)
          .where(eq(posts.authorId, userId)),
        forumMessages: await db
          .select({
            id: messages.id,
            parentId: messages.parentId,
            content: messages.content,
            status: messages.status,
            createdAt: messages.createdAt,
            editedAt: messages.editedAt,
          })
          .from(messages)
          .where(eq(messages.authorId, userId))
          .orderBy(asc(messages.createdAt)),
        forumLikes: await db
          .select({
            messageId: messageLikes.messageId,
            createdAt: messageLikes.createdAt,
          })
          .from(messageLikes)
          .where(eq(messageLikes.userId, userId)),
        forumReports: await db
          .select({
            messageId: messageReports.messageId,
            reason: messageReports.reason,
            details: messageReports.details,
            status: messageReports.status,
            createdAt: messageReports.createdAt,
          })
          .from(messageReports)
          .where(eq(messageReports.reporterId, userId)),
        evaluations: evaluations.map(({ id, ...evaluation }) => ({
          ...evaluation,
          scores: Object.fromEntries(
            scores
              .filter((score) => score.evaluationId === id)
              .map((score) => [score.criterion, score.score]),
          ),
        })),
        notifications: await db
          .select({
            type: notifications.type,
            data: notifications.data,
            readAt: notifications.readAt,
            createdAt: notifications.createdAt,
          })
          .from(notifications)
          .where(eq(notifications.userId, userId)),
      }
    },

    async erase(userId, now) {
      // Curtidas somem em cascata; os contadores das mensagens descem antes
      await db
        .update(messages)
        .set({ likeCount: sql`greatest(${messages.likeCount} - 1, 0)` })
        .where(
          inArray(
            messages.id,
            db
              .select({ id: messageLikes.messageId })
              .from(messageLikes)
              .where(eq(messageLikes.userId, userId)),
          ),
        )
      // O texto da pessoa sai também das denúncias (cópia e observação)
      await db
        .update(messageReports)
        .set({ contentSnapshot: '' })
        .where(inArray(messageReports.messageId, messageIds(userId)))
      await db
        .update(messageReports)
        .set({ details: null })
        .where(eq(messageReports.reporterId, userId))
      await db
        .delete(messageSubjectMentions)
        .where(inArray(messageSubjectMentions.messageId, messageIds(userId)))
      // "Mensagem removida": a thread fica, sem texto e sem autor. As já
      // removidas pela moderação mantêm o motivo.
      await db
        .update(messages)
        .set({
          content: '',
          status: 'REMOVED',
          removedAt: now,
          removedBy: null,
          removalReason: ACCOUNT_DELETED_REASON,
        })
        .where(
          and(eq(messages.authorId, userId), ne(messages.status, 'REMOVED')),
        )
      await db
        .update(messages)
        .set({ content: '' })
        .where(eq(messages.authorId, userId))
      // Avisos na caixa dos outros sobre o que a pessoa fez (respostas,
      // curtidas, pedidos) levam o nome dela
      await db.delete(notifications).where(eq(notifications.actorId, userId))
      // O resto sai pelas FKs: CASCADE nos dados pessoais, SET NULL na
      // autoria (posts, avaliações, denúncias, auditoria)
      await db.delete(users).where(eq(users.id, userId))
    },
  }
}
