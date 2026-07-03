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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import type { EvidenceFileRow } from './interfaces/evidence-file-row.interface';
import type { EvidenceItemRow } from './interfaces/evidence-item-row.interface';
import type { IntegrityResult } from './interfaces/integrity-result.interface';
import { EvidenceService } from './evidence.service';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

@ApiTags('Evidence')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Your role does not have permission for this action',
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
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR, UserRole.CUSTODIAN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register an evidence item for an investigation',
  })
  @ApiCreatedResponse({
    description: 'Evidence registered successfully',
  })
  @ApiConflictResponse({
    description: 'Evidence code already exists',
  })
  @ApiNotFoundResponse({
    description: 'Investigation not found',
  })
  async create(
    @CurrentUser() user: JwtPayload,

    @Param('investigationId', new ParseUUIDPipe())
    investigationId: string,

    @Body() dto: CreateEvidenceDto,
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
    summary: 'Get evidence registered for an investigation',
  })
  async findByInvestigation(
    @CurrentUser() user: JwtPayload,

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
    summary: 'Get an evidence item by UUID',
  })
  async findOne(
    @CurrentUser() user: JwtPayload,

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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Evidence file, maximum 100 MB',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload an evidence file to MinIO and calculate SHA-256',
  })
  @ApiCreatedResponse({
    description: 'Evidence file uploaded successfully',
  })
  @ApiConflictResponse({
    description: 'The same file was already uploaded',
  })
  async uploadFile(
    @CurrentUser() user: JwtPayload,

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
      throw new BadRequestException('Evidence file is required');
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
    summary: 'Get files attached to an evidence item',
  })
  async findFiles(
    @CurrentUser() user: JwtPayload,

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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify evidence-file integrity using SHA-256',
  })
  @ApiOkResponse({
    description: 'File integrity verification completed',
  })
  async verifyFile(
    @CurrentUser() user: JwtPayload,

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
    );

    return {
      success: true,
      message: result.matches
        ? 'Evidence file integrity verified successfully'
        : 'Evidence file integrity verification failed',
      data: result,
    };
  }
}
