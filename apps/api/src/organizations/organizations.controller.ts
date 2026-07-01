import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import type { OrganizationRow } from './interfaces/organization-row.interface';
import { OrganizationsService } from './organizations.service';

interface OrganizationResponse {
  success: boolean;
  message: string;
  data: OrganizationRow;
}

interface OrganizationListResponse {
  success: boolean;
  message: string;
  data: OrganizationRow[];
}

@ApiTags('Organizations')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Administrator role is required',
})
@Roles(UserRole.ADMIN)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new organization',
  })
  @ApiCreatedResponse({
    description: 'Organization created successfully',
  })
  @ApiConflictResponse({
    description: 'An organization with this slug already exists',
  })
  async create(
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationsService.create(dto);

    return {
      success: true,
      message: 'Organization created successfully',
      data: organization,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all organizations',
  })
  @ApiOkResponse({
    description: 'Organizations retrieved successfully',
  })
  async findAll(): Promise<OrganizationListResponse> {
    const organizations = await this.organizationsService.findAll();

    return {
      success: true,
      message: 'Organizations retrieved successfully',
      data: organizations,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an organization by UUID',
  })
  @ApiOkResponse({
    description: 'Organization retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<OrganizationResponse> {
    const organization = await this.organizationsService.findOne(id);

    return {
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }
}
