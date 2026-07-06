import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { EvidenceService } from './evidence.service';
import type {
  CreateEvidenceInput,
  EvidenceFileRow,
  EvidenceItemRow,
  IntegrityResult,
} from './evidence.service';

const MAX_EVIDENCE_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export class CreateEvidenceDto implements CreateEvidenceInput {
  @ApiProperty({
    example: 'EVD-2026-0003',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  evidenceCode!: string;

  @ApiProperty({
    example: 'External storage device',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'USB device collected from the suspect workstation.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    example: 'DIGITAL_MEDIA',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  evidenceType!: string;

  @ApiPropertyOptional({
    example: '2026-07-03T10:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  collectedAt?: string;

  @ApiPropertyOptional({
    example: 'Digital Forensics Lab 02',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  collectionLocation?: string;
}

@ApiTags('Evidence')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Your role cannot perform this action',
})
@Roles(
  UserRole.ADMIN,
  UserRole.INVESTIGATOR,
  UserRole.CUSTODIAN,
  UserRole.AUDITOR,
)
@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Post('investigations/:investigationId/evidence')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register evidence under an investigation',
  })
  @ApiParam({
    name: 'investigationId',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Evidence registered successfully',
  })
  async create(
    @CurrentUser()
    user: JwtPayload,

    @Param('investigationId', new ParseUUIDPipe())
    investigationId: string,

    @Body()
    dto: CreateEvidenceDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: EvidenceItemRow;
  }> {
    const evidence = await this.evidenceService.create(
      user.organizationId,
      investigationId,
      user.sub,
      dto,
    );

    return {
      success: true,
      message: 'Evidence registered successfully',
      data: evidence,
    };
  }

  @Get('investigations/:investigationId/evidence')
  @ApiOperation({
    summary: 'Get all evidence under an investigation',
  })
  @ApiParam({
    name: 'investigationId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Evidence retrieved successfully',
  })
  async findAllByInvestigation(
    @CurrentUser()
    user: JwtPayload,

    @Param('investigationId', new ParseUUIDPipe())
    investigationId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: EvidenceItemRow[];
  }> {
    const evidence = await this.evidenceService.findAllByInvestigation(
      user.organizationId,
      investigationId,
    );

    return {
      success: true,
      message: 'Evidence retrieved successfully',
      data: evidence,
    };
  }

  @Get('evidence/:evidenceId')
  @ApiOperation({
    summary: 'Get one evidence item',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Evidence retrieved successfully',
  })
  async findOne(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: EvidenceItemRow;
  }> {
    const evidence = await this.evidenceService.findOne(
      user.organizationId,
      evidenceId,
    );

    return {
      success: true,
      message: 'Evidence retrieved successfully',
      data: evidence,
    };
  }

  @Post('evidence/:evidenceId/files')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_EVIDENCE_FILE_SIZE_BYTES,
      },
    }),
  )
  @ApiOperation({
    summary: 'Upload a file for an evidence item',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Evidence file uploaded successfully',
  })
  async uploadFile(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,

    @UploadedFile()
    file: Express.Multer.File | undefined,
  ): Promise<{
    success: boolean;
    message: string;
    data: EvidenceFileRow;
  }> {
    if (!file) {
      throw new BadRequestException('An evidence file is required');
    }

    const evidenceFile = await this.evidenceService.uploadFile(
      user.organizationId,
      evidenceId,
      user.sub,
      file,
    );

    return {
      success: true,
      message: 'Evidence file uploaded successfully',
      data: evidenceFile,
    };
  }

  @Get('evidence/:evidenceId/files')
  @ApiOperation({
    summary: 'Get files uploaded for an evidence item',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Evidence files retrieved successfully',
  })
  async findFiles(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: EvidenceFileRow[];
  }> {
    const files = await this.evidenceService.findFiles(
      user.organizationId,
      evidenceId,
    );

    return {
      success: true,
      message: 'Evidence files retrieved successfully',
      data: files,
    };
  }

  @Post('evidence/:evidenceId/files/:fileId/verify')
  @Roles(
    UserRole.ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.CUSTODIAN,
    UserRole.AUDITOR,
  )
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the SHA-256 integrity of an evidence file',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiParam({
    name: 'fileId',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Evidence integrity verification completed',
  })
  async verifyFile(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,

    @Param('fileId', new ParseUUIDPipe())
    fileId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: IntegrityResult;
  }> {
    const result = await this.evidenceService.verifyFile(
      user.organizationId,
      evidenceId,
      fileId,
      user.sub,
    );

    return {
      success: true,
      message: result.matches
        ? 'Evidence file integrity verified successfully'
        : 'Evidence file integrity verification failed',
      data: result,
    };
  }

  @Get('evidence/:evidenceId/files/:fileId/download')
  @Roles(
    UserRole.ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.CUSTODIAN,
    UserRole.AUDITOR,
  )
  @ApiOperation({
    summary: 'Securely download an evidence file',
  })
  @ApiParam({
    name: 'evidenceId',
    format: 'uuid',
  })
  @ApiParam({
    name: 'fileId',
    format: 'uuid',
  })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Evidence file downloaded successfully',
  })
  async downloadFile(
    @CurrentUser()
    user: JwtPayload,

    @Param('evidenceId', new ParseUUIDPipe())
    evidenceId: string,

    @Param('fileId', new ParseUUIDPipe())
    fileId: string,

    @Res({
      passthrough: true,
    })
    response: Response,
  ): Promise<StreamableFile> {
    const result = await this.evidenceService.downloadFile(
      user.organizationId,
      evidenceId,
      fileId,
      user.sub,
    );

    const encodedFilename = encodeURIComponent(result.file.originalFilename);

    response.setHeader(
      'Content-Type',
      result.file.mimeType || 'application/octet-stream',
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );

    response.setHeader('Content-Length', String(result.file.sizeBytes));

    return new StreamableFile(result.stream);
  }
}
