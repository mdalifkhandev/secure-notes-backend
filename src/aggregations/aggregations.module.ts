import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Post, PostSchema } from '../schemas/post.schema';
import { AggregationsService } from './aggregations.service';
import { AggregationsController } from './aggregations.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [AggregationsController],
  providers: [AggregationsService],
  exports: [AggregationsService],
})
export class AggregationsModule {}
