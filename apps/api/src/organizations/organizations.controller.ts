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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
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
    description: 'Organization slug already exists',
  })
  async create(@Body() dto: CreateOrganizationDto) {
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
  async findAll() {
    const organizations = await this.organizationsService.findAll();

    return {
      success: true,
      message: 'Organizations retrieved successfully',
      data: organizations,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get organization by ID',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.organizationsService.findOne(id);

    return {
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    };
  }
}
