import { Injectable } from '@nestjs/common'
import sharp from 'sharp'

import { FilesErrors } from '../../domain/errors'
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE } from '../../domain/file'
import type { ImageProcessor } from '../../domain/ports'

// WebP, no máximo 2000 px no lado maior e sem metadados: o sharp só copia
// EXIF (inclusive GPS) se pedirem withMetadata, e não pedimos. A rotação do
// EXIF é aplicada antes, para a foto não sair deitada.
@Injectable()
export class SharpImageProcessor implements ImageProcessor {
  async process(content: Uint8Array) {
    try {
      const { data, info } = await sharp(content, {
        limitInputPixels: MAX_IMAGE_PIXELS,
        // Animações viram o primeiro quadro
        animated: false,
      })
        .rotate()
        .resize({
          width: MAX_IMAGE_SIDE,
          height: MAX_IMAGE_SIDE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      return {
        content: new Uint8Array(data),
        width: info.width,
        height: info.height,
      }
    } catch (error) {
      if (/pixel limit/i.test((error as Error).message)) {
        throw FilesErrors.imageTooLarge()
      }
      throw FilesErrors.unreadable()
    }
  }
}
