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
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserRole } from './enums/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Access token is missing or invalid',
})
@ApiForbiddenResponse({
  description: 'Administrator role is required',
})
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new organization user',
  })
  @ApiCreatedResponse({
    description: 'User created successfully',
  })
  @ApiConflictResponse({
    description: 'Email already exists in the organization',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);

    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
  })
  async findAll(@Query() query: ListUsersQueryDto) {
    const users = await this.usersService.findAll(query.organizationId);

    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by UUID',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.usersService.findOne(id);

    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a user',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateStatus(id, dto.isActive);

    return {
      success: true,
      message: dto.isActive
        ? 'User activated successfully'
        : 'User deactivated successfully',
      data: user,
    };
  }
}
