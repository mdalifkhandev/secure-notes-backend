import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['user', 'admin'], default: 'user' })
  role: 'user' | 'admin';

  @Prop({ type: [String], default: [] })
  interests: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

/*
 * ============================================================================
 * EXPLICIT DATABASE INDEXES (Defined via schema.index as required)
 * Constraint: NO UNNECESSARY INDEXES. Only create strictly required indexes.
 * ============================================================================
 */

// 1. Email Lookup & Uniqueness Index:
// Required for: Authentication login lookup and registration uniqueness check.
UserSchema.index({ email: 1 }, { unique: true });

// 2. Multikey Index on Interests Array:
// Required for: Scenario 1 Aggregation Pipeline ($unwind + $group by interests).
// Enables index-assisted scanning when grouping users by their interest tags.
UserSchema.index({ interests: 1 });

// 3. Admin User List Pagination Index:
// Required for: Admin listing all registered users with pagination sorted by newest first.
UserSchema.index({ createdAt: -1 });
