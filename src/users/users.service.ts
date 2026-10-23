import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    // Automatically seed an initial admin account for reviewers if none exists
    await this.seedInitialAdmin();
  }

  private async seedInitialAdmin() {
    const adminExists = await this.userModel.findOne({ role: 'admin' }).lean();
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await this.userModel.create({
        name: 'System Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        interests: ['chess', 'cybersecurity', 'cloud'],
      });
      console.log('✅ Seeded default admin account: admin@example.com / admin123');
    }
  }

  /**
   * List all users with pagination.
   * Query optimization: Uses index UserSchema.index({ createdAt: -1 })
   */
  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<Omit<User, 'password'>>> {
    const { page, limit } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password')
        .lean(),
      this.userModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).select('-password').lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, role, interests } = createUserDto;

    const existing = await this.userModel.findOne({ email }).lean();
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      interests: interests || [],
    });

    return this.findById(user._id.toString());
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updates: Partial<User> = {};

    if (updateUserDto.name) updates.name = updateUserDto.name;
    if (updateUserDto.role) updates.role = updateUserDto.role;
    if (updateUserDto.interests) updates.interests = updateUserDto.interests;

    if (updateUserDto.email) {
      const existing = await this.userModel.findOne({ email: updateUserDto.email }).lean();
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException('Email already in use by another account');
      }
      updates.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, updates, { new: true })
      .select('-password')
      .lean();

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id).select('-password').lean();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully', id };
  }
}
