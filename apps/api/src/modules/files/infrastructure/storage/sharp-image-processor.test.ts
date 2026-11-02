import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { SharpImageProcessor } from './sharp-image-processor'

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#0ea5e9' } })
    .png()
    .toBuffer()

describe('SharpImageProcessor', () => {
  const processor = new SharpImageProcessor()

  it('imagem pequena não aumenta e sai em WebP', async () => {
    const result = await processor.process(await image(640, 480))
    expect(result).toMatchObject({ width: 640, height: 480 })
    expect((await sharp(result.content).metadata()).format).toBe('webp')
  })

  it('imagem em pé reduz pelo lado maior', async () => {
    const result = await processor.process(await image(1500, 4000))
    expect(result).toMatchObject({ width: 750, height: 2000 })
  })

  it('recusa arquivo corrompido e imagem gigante em pixels', async () => {
    const broken = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3])
    await expect(processor.process(broken)).rejects.toMatchObject({
      code: 'FILE_UNREADABLE',
    })
    const huge = await image(8000, 6000)
    await expect(processor.process(huge)).rejects.toMatchObject({
      code: 'FILE_IMAGE_TOO_LARGE',
    })
  })
})
