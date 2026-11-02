import {
  filePurposeSchema,
  fileStatusSchema,
  fileVisibilitySchema,
} from '@ufc-flow/contracts'
import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { courses } from '../../../catalog/infrastructure/persistence/catalog.schema'
import { users } from '../../../identity/infrastructure/persistence/identity.schema'

const values = <T extends string>(options: readonly T[]) =>
  options as unknown as [T, ...T[]]

export const filePurpose = pgEnum(
  'file_purpose',
  values(filePurposeSchema.options),
)
export const fileVisibility = pgEnum(
  'file_visibility',
  values(fileVisibilitySchema.options),
)
export const fileStatus = pgEnum(
  'file_status',
  values(fileStatusSchema.options),
)

const instant = (name: string) => timestamp(name, { withTimezone: true })

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey(),
    // Arquivos pessoais somem com a conta; os do curso ficam (autor nulo)
    ownerId: uuid('owner_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    // Curso excluído: a limpeza apaga os arquivos dele do disco
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    purpose: filePurpose('purpose').notNull(),
    visibility: fileVisibility('visibility').notNull(),
    // {finalidade}/{aaaa}/{mm}/{id}.{ext}; o nome original fica só aqui
    storageKey: text('storage_key').notNull().unique(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    sha256: text('sha256').notNull(),
    status: fileStatus('status').notNull(),
    createdAt: instant('created_at').notNull(),
    attachedAt: instant('attached_at'),
    deletedAt: instant('deleted_at'),
  },
  (table) => [
    index('files_owner_created').on(table.ownerId, table.createdAt),
    index('files_cleanup').on(table.status, table.createdAt),
  ],
)
