import { Controller, Get, Post, Put, Delete, Body, Param, NotFoundException, Inject } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDtoSchema, UpdateUserDtoSchema, type CreateUserDto, type UpdateUserDto } from './dto.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() body: CreateUserDto) {
    const validated = CreateUserDtoSchema.parse(body);
    return this.usersService.createUser(validated);
  }

  @Get()
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.getUser(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    const validated = UpdateUserDtoSchema.parse(body);
    const user = await this.usersService.updateUser(id, validated);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    const deleted = await this.usersService.deleteUser(id);
    if (!deleted) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return { deleted: true };
  }
}
