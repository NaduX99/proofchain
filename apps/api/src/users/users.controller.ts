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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
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
    summary: 'Get user by ID',
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
