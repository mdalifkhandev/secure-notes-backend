import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from '../schemas/note.schema';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
  ) {}

  async create(userId: string, createNoteDto: CreateNoteDto): Promise<Note> {
    const note = await this.noteModel.create({
      title: createNoteDto.title,
      content: createNoteDto.content,
      owner: new Types.ObjectId(userId),
    });

    return note.toObject();
  }

  /**
   * List notes belonging to the authenticated user.
   * Query optimization: Fully supported by compound index NoteSchema.index({ owner: 1, createdAt: -1 })
   */
  async findUserNotes(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Note>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;
    const ownerId = new Types.ObjectId(userId);

    const [data, total] = await Promise.all([
      this.noteModel
        .find({ owner: ownerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email')
        .lean(),
      this.noteModel.countDocuments({ owner: ownerId }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin-only: List everyone's notes across the entire platform.
   * Query optimization: Supported by NoteSchema.index({ createdAt: -1 })
   */
  async findAllNotes(paginationDto: PaginationDto): Promise<PaginatedResult<Note>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.noteModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email role')
        .lean(),
      this.noteModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieve a specific note by ID.
   * Read operation optimization: Uses native MongoDB primary key index on '_id'.
   * Enforces role-based ownership: only note owner or admin can read.
   */
  async findOne(id: string, user: AuthenticatedUser): Promise<Note> {
    const note = await this.noteModel.findById(id).populate('owner', 'name email').lean();

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const isOwner = note.owner?._id?.toString() === user.userId || note.owner?.toString() === user.userId;
    if (!isOwner && user.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to view this note');
    }

    return note;
  }

  async update(id: string, user: AuthenticatedUser, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.noteModel.findById(id);

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const isOwner = note.owner.toString() === user.userId;
    if (!isOwner && user.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to edit this note');
    }

    if (updateNoteDto.title !== undefined) note.title = updateNoteDto.title;
    if (updateNoteDto.content !== undefined) note.content = updateNoteDto.content;

    await note.save();
    return note.toObject();
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ message: string; id: string }> {
    const note = await this.noteModel.findById(id);

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const isOwner = note.owner.toString() === user.userId;
    if (!isOwner && user.role !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this note');
    }

    await this.noteModel.findByIdAndDelete(id);
    return { message: 'Note deleted successfully', id };
  }
}
