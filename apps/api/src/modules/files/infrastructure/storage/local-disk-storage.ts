import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

import { Inject, Injectable } from '@nestjs/common'

import { FilesErrors } from '../../domain/errors'
import type { FileStorage } from '../../domain/ports'

export const UPLOADS_ROOT = Symbol('UploadsRoot')

// Disco da VM (volume Docker montado em /data/uploads em produção)
@Injectable()
export class LocalDiskStorage implements FileStorage {
  private readonly root: string

  constructor(@Inject(UPLOADS_ROOT) root: string) {
    this.root = resolve(root)
  }

  // A chave vem do domínio, mas o caminho nunca sai da pasta de uploads
  private pathOf(key: string) {
    const path = resolve(this.root, key)
    if (!path.startsWith(this.root + sep)) {
      throw new Error(`Chave de arquivo fora da pasta: ${key}`)
    }
    return path
  }

  async put(key: string, content: Uint8Array) {
    const path = this.pathOf(key)
    await mkdir(dirname(path), { recursive: true })
    // Escreve num temporário e renomeia: ninguém lê um arquivo pela metade
    const temporary = `${path}.${randomUUID()}.tmp`
    await writeFile(temporary, content)
    await rename(temporary, path)
  }

  async read(key: string) {
    const path = this.pathOf(key)
    try {
      await stat(path)
    } catch {
      throw FilesErrors.fileNotFound()
    }
    return createReadStream(path)
  }

  async delete(key: string) {
    await rm(this.pathOf(key), { force: true })
  }
}
