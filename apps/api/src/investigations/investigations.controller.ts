import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateInvestigationDto } from './dto/create-investigation.dto';
import { ListInvestigationsQueryDto } from './dto/list-investigations-query.dto';
import { UpdateInvestigationStatusDto } from './dto/update-investigation-status.dto';
import { UpdateInvestigationDto } from './dto/update-investigation.dto';
import type { InvestigationRow } from './interfaces/investigation-row.interface';
import { InvestigationsService } from './investigations.service';

@ApiTags('Investigations')
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
@Controller('investigations')
export class InvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new investigation',
  })
  @ApiCreatedResponse({
    description: 'Investigation created successfully',
  })
  @ApiConflictResponse({
    description: 'Case code already exists in the organization',
  })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateInvestigationDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: InvestigationRow;
  }> {
    const investigation = await this.investigationsService.create(
      user.organizationId,
      user.sub,
      dto,
    );

    return {
      success: true,
      message: 'Investigation created successfully',
      data: investigation,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get investigations belonging to the current organization',
  })
  @ApiOkResponse({
    description: 'Investigations retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListInvestigationsQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: InvestigationRow[];
  }> {
    const investigations = await this.investigationsService.findAll(
      user.organizationId,
      query.status,
    );

    return {
      success: true,
      message: 'Investigations retrieved successfully',
      data: investigations,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an investigation by UUID',
  })
  @ApiOkResponse({
    description: 'Investigation retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Investigation not found',
  })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe())
    investigationId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: InvestigationRow;
  }> {
    const investigation = await this.investigationsService.findOne(
      user.organizationId,
      investigationId,
    );

    return {
      success: true,
      message: 'Investigation retrieved successfully',
      data: investigation,
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  @ApiOperation({
    summary: 'Update an investigation title or description',
  })
  @ApiOkResponse({
    description: 'Investigation updated successfully',
  })
  @ApiNotFoundResponse({
    description: 'Investigation not found',
  })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe())
    investigationId: string,
    @Body() dto: UpdateInvestigationDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: InvestigationRow;
  }> {
    const investigation = await this.investigationsService.update(
      user.organizationId,
      investigationId,
      dto,
    );

    return {
      success: true,
      message: 'Investigation updated successfully',
      data: investigation,
    };
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  @ApiOperation({
    summary: 'Change the status of an investigation',
  })
  @ApiOkResponse({
    description: 'Investigation status updated successfully',
  })
  @ApiNotFoundResponse({
    description: 'Investigation not found',
  })
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe())
    investigationId: string,
    @Body() dto: UpdateInvestigationStatusDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: InvestigationRow;
  }> {
    const investigation = await this.investigationsService.updateStatus(
      user.organizationId,
      investigationId,
      dto.status,
    );

    return {
      success: true,
      message: 'Investigation status updated successfully',
      data: investigation,
    };
  }
}
