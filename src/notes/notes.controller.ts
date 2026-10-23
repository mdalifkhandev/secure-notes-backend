import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('api/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return this.notesService.create(user.userId, createNoteDto);
  }

  /**
   * List notes with pagination.
   * If query parameter 'all=true' and user is admin, returns all notes across users.
   * Otherwise returns the authenticated user's own notes.
   */
  @Get()
  async findNotes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() paginationDto: PaginationDto,
    @Query('all') all?: string,
  ) {
    if (all === 'true' && user.role === 'admin') {
      return this.notesService.findAllNotes(paginationDto);
    }
    return this.notesService.findUserNotes(user.userId, paginationDto);
  }

  /**
   * Dedicated endpoint for admin to view everyone's notes with pagination.
   */
  @Get('admin/all')
  @Roles('admin')
  async findAllAdminNotes(@Query() paginationDto: PaginationDto) {
    return this.notesService.findAllNotes(paginationDto);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.findOne(id, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return this.notesService.update(id, user, updateNoteDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notesService.remove(id, user);
  }
}
