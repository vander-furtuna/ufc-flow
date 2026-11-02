import { describe, expect, it } from 'vitest'

import { avatarInputSchema, fileUploadInputSchema } from './files'

const ID = '0b6f9a54-3c1e-4c55-9d43-0f8f1d1c2a10'

describe('arquivos', () => {
  it('upload pede a finalidade e aceita o curso', () => {
    expect(fileUploadInputSchema.parse({ purpose: 'AVATAR' })).toEqual({
      purpose: 'AVATAR',
    })
    expect(
      fileUploadInputSchema.safeParse({ purpose: 'POST_COVER', courseId: ID })
        .success,
    ).toBe(true)
    expect(fileUploadInputSchema.safeParse({ purpose: 'OUTRO' }).success).toBe(
      false,
    )
    expect(
      fileUploadInputSchema.safeParse({ purpose: 'AVATAR', courseId: 'x' })
        .success,
    ).toBe(false)
  })

  it('foto de perfil pelo id do arquivo', () => {
    expect(avatarInputSchema.safeParse({ fileId: ID }).success).toBe(true)
    expect(avatarInputSchema.safeParse({}).success).toBe(false)
  })
})
