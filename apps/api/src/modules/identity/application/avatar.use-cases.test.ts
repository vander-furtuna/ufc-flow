import { describe, expect, it } from 'vitest'

import type { FileRecord } from '../../files/domain/file'
import { RemoveAvatarUseCase, SetAvatarUseCase } from './avatar.use-cases'
import { identityTestbed } from './testing/in-memory-identity'

const file = (id: string, overrides: Partial<FileRecord> = {}): FileRecord => ({
  id,
  ownerId: 'u1',
  courseId: null,
  purpose: 'AVATAR',
  visibility: 'PUBLIC',
  storageKey: `avatar/2026/11/${id}.webp`,
  originalName: 'foto.jpg',
  mimeType: 'image/webp',
  sizeBytes: 1000,
  width: 400,
  height: 400,
  sha256: 'x',
  status: 'PENDING',
  createdAt: new Date('2026-11-01T11:00:00Z'),
  attachedAt: null,
  deletedAt: null,
  ...overrides,
})

function setup() {
  const t = identityTestbed()
  t.store.users.set('u1', {
    id: 'u1',
    name: 'Ana Souza',
    email: 'ana@ufc.br',
    passwordHash: 'x',
    status: 'ACTIVE',
    createdAt: t.clock.now(),
    updatedAt: t.clock.now(),
  })
  for (const item of [
    file('f1'),
    file('f2'),
    file('alheio', { ownerId: 'u2' }),
    file('certificado', { purpose: 'CERTIFICATE', visibility: 'PRIVATE' }),
  ]) {
    t.store.files.set(item.id, item)
  }
  return {
    ...t,
    set: new SetAvatarUseCase(t.store, t.clock),
    remove: new RemoveAvatarUseCase(t.store, t.clock),
  }
}

describe('foto de perfil', () => {
  it('liga o arquivo, solta o anterior e aparece no Me', async () => {
    const s = setup()
    expect((await s.set.execute('u1', 'f1')).avatarFileId).toBe('f1')
    expect(s.store.files.get('f1')).toMatchObject({
      status: 'ATTACHED',
      attachedAt: s.clock.now(),
    })
    const me = await s.set.execute('u1', 'f2')
    expect(me.avatarFileId).toBe('f2')
    expect(s.store.files.get('f1')!.deletedAt).toEqual(s.clock.now())
    // Repetir a mesma foto não muda nada
    expect((await s.set.execute('u1', 'f2')).avatarFileId).toBe('f2')
  })

  it('recusa arquivo de outra pessoa, de outra finalidade ou inexistente', async () => {
    const s = setup()
    await expect(s.set.execute('u1', 'alheio')).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    await expect(s.set.execute('u1', 'certificado')).rejects.toMatchObject({
      code: 'FILE_WRONG_PURPOSE',
    })
    await expect(s.set.execute('u1', 'nada')).rejects.toMatchObject({
      code: 'FILE_NOT_FOUND',
    })
    await expect(s.set.execute('ninguem', 'f1')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    })
  })

  it('remover volta para as iniciais e solta o arquivo', async () => {
    const s = setup()
    await s.set.execute('u1', 'f1')
    expect((await s.remove.execute('u1')).avatarFileId).toBeNull()
    expect(s.store.files.get('f1')!.deletedAt).not.toBeNull()
    // Sem foto, remover de novo não falha
    expect((await s.remove.execute('u1')).avatarFileId).toBeNull()
    await expect(s.remove.execute('ninguem')).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    })
  })
})
