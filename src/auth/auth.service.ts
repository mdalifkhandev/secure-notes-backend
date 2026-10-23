import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, interests } = registerDto;

    // Check if user already exists (Utilizes unique index on email)
    const existing = await this.userModel.findOne({ email }).lean();
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Secure password hashing with salt rounds
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (first user or default gets 'user' role)
    const newUser = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      interests: interests || [],
    });

    const token = this.generateToken(newUser._id.toString(), newUser.email, newUser.role);

    return {
      message: 'Registration successful',
      accessToken: token,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        interests: newUser.interests,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Email lookup utilizes { email: 1 } index
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.generateToken(user._id.toString(), user.email, user.role);

    return {
      message: 'Login successful',
      accessToken: token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password').lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  private generateToken(userId: string, email: string, role: 'user' | 'admin'): string {
    const payload: JwtPayload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
