import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  author: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

/*
 * ============================================================================
 * EXPLICIT DATABASE INDEXES (Defined via schema.index as required)
 * Constraint: NO UNNECESSARY INDEXES. Only create strictly required indexes.
 * ============================================================================
 */

// 1. Compound Index for Author Posts & Lookup Optimization:
// Required for: Scenario 2 Aggregation Pipeline ($lookup from User to Post on 'author')
// and querying all posts authored by a specific user sorted by date.
PostSchema.index({ author: 1, createdAt: -1 });

// 2. Index for Public Posts Listing:
// Required for: Public feed of all user posts sorted by newest first with pagination.
// Query pattern: find({}).sort({ createdAt: -1 }).skip(...).limit(...)
PostSchema.index({ createdAt: -1 });
