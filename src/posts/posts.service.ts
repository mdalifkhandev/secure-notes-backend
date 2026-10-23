import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const post = await this.postModel.create({
      title: createPostDto.title,
      content: createPostDto.content,
      author: new Types.ObjectId(userId),
    });

    return post.toObject();
  }

  /**
   * Public posts feed with pagination.
   * Query optimization: Supported by PostSchema.index({ createdAt: -1 })
   */
  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<Post>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.postModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name email')
        .lean(),
      this.postModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string): Promise<Post> {
    const post = await this.postModel.findById(id).populate('author', 'name email').lean();
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }
}
