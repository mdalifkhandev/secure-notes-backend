import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Post, PostDocument } from '../schemas/post.schema';

@Injectable()
export class AggregationsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  /**
   * ============================================================================
   * SCENARIO 1: Group by Interests
   * Context: User profiles contain a list of interests (e.g., ['chess', 'reading']).
   * Task: Specific view to see users grouped by interests.
   * Constraint: Exactly ONE collection.aggregate() call. No other methods used.
   * Index Support: Supported by multikey index UserSchema.index({ interests: 1 })
   * ============================================================================
   */
  async groupByInterests() {
    return this.userModel.aggregate([
      // Stage 1: Deconstruct interests array so each interest becomes an individual document
      { $unwind: '$interests' },

      // Stage 2: Group by interest and accumulate user profiles into an array
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email',
              role: '$role',
            },
          },
        },
      },

      // Stage 3: Reshape output for clean readability
      {
        $project: {
          _id: 0,
          interest: '$_id',
          count: 1,
          users: 1,
        },
      },

      // Stage 4: Order by most popular interests first, then alphabetically
      { $sort: { count: -1, interest: 1 } },
    ]);
  }

  /**
   * ============================================================================
   * SCENARIO 2: User Posts ($lookup)
   * Context: Users can write posts stored in a separate Posts collection.
   * Task: Retrieve all posts belonging to a particular user.
   * Constraint: A single aggregation pipeline with a $lookup stage.
   * Index Support: Supported by compound index PostSchema.index({ author: 1, createdAt: -1 })
   * ============================================================================
   */
  async getUserPosts(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const userObjectId = new Types.ObjectId(userId);

    const result = await this.userModel.aggregate([
      // Stage 1: Match the specific target user by ObjectId
      { $match: { _id: userObjectId } },

      // Stage 2: Join posts collection where post.author matches user._id
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          as: 'posts',
        },
      },

      // Stage 3: Exclude sensitive credentials and internal schema metadata
      {
        $project: {
          password: 0,
          __v: 0,
          'posts.__v': 0,
        },
      },
    ]);

    if (!result || result.length === 0) {
      throw new NotFoundException('User not found');
    }

    return result[0];
  }
}
