import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger'
import {
  fileUploadInputSchema,
  uuidSchema,
  type FileUploadInput,
} from '@ufc-flow/contracts'
import type { Response } from 'express'

import { DomainError } from '../../../../shared/domain/domain-error'
import {
  ApiJson,
  ApiProblems,
  schemaRef,
} from '../../../../shared/infrastructure/http/openapi'
import { ZodValidationPipe } from '../../../../shared/infrastructure/http/zod-validation.pipe'
import { LoadActorUseCase } from '../../../identity/application/load-actor.use-case'
import {
  AuthGuard,
  CurrentUserId,
  OptionalAuthGuard,
  OptionalUserId,
} from '../../../identity/infrastructure/http/auth.guard'
import {
  ReadFileUseCase,
  UploadFileUseCase,
} from '../../application/files.use-cases'
import { MAX_UPLOAD_BYTES } from '../../domain/file'

const idParam = new ZodValidationPipe(uuidSchema)

// O que o multer entrega do campo "file" (só o que é usado)
type UploadedPart = { buffer: Buffer; originalname: string }

// O conteúdo de um id nunca muda: cache de um ano nos públicos
const PUBLIC_CACHE = 'public, max-age=31536000, immutable'

@ApiTags('files')
@Controller('v1/files')
export class FilesController {
  constructor(
    @Inject(UploadFileUseCase) private readonly upload: UploadFileUseCase,
    @Inject(ReadFileUseCase) private readonly read: ReadFileUseCase,
    @Inject(LoadActorUseCase) private readonly loadActor: LoadActorUseCase,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  // Em memória (sem destino, o multer guarda no buffer) e com o maior
  // limite das finalidades; o da finalidade e o tipo pelos bytes são
  // conferidos no caso de uso
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
    }),
  )
  @ApiOperation({
    summary: 'Enviar um arquivo',
    description:
      'Multipart com o arquivo em "file" e a finalidade. O tipo é conferido pelos bytes. Imagens viram WebP com no máximo 2000 px e sem EXIF. O arquivo nasce PENDING e some em 24 h se nada o usar. Limites: AVATAR 5 MB; imagens de posts e links 8 MB; CERTIFICATE 10 MB; LINK_FILE 15 MB; 60 envios por hora.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['file', 'purpose'],
      properties: {
        file: { type: 'string', format: 'binary' },
        purpose: schemaRef('FilePurpose'),
        courseId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiJson(201, 'Arquivo pendente', schemaRef('File'))
  @ApiProblems(400, 401, 403, 413, 429)
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodValidationPipe(fileUploadInputSchema)) input: FileUploadInput,
    @UploadedFile() file: UploadedPart | undefined,
  ) {
    if (!file) {
      throw new DomainError(
        'FILE_REQUIRED',
        'INVALID',
        'Envie o arquivo no campo "file"',
      )
    }
    return this.upload.execute(await this.loadActor.execute(userId), {
      purpose: input.purpose,
      courseId: input.courseId ?? null,
      // O multer lê o nome em latin1
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      content: new Uint8Array(file.buffer),
    })
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Conteúdo do arquivo',
    description:
      'Públicos para qualquer um, com cache longo. Privados (certificados) só para o dono, com o token.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiProduces('image/webp', 'application/pdf')
  @ApiJson(200, 'Conteúdo do arquivo')
  @ApiProblems(400, 404)
  async content(
    @OptionalUserId() userId: string | null,
    @Param('id', idParam) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { file, content } = await this.read.execute(userId, id)
    const filename = encodeURIComponent(file.originalName)
    response.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'Cache-Control':
        file.visibility === 'PUBLIC' ? PUBLIC_CACHE : 'private, no-store',
      'Content-Disposition': `inline; filename*=UTF-8''${filename}`,
      'X-Content-Type-Options': 'nosniff',
    })
    return new StreamableFile(content)
  }
}
