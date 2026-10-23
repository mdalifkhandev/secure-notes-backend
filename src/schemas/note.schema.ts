import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  owner: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

/*
 * ============================================================================
 * EXPLICIT DATABASE INDEXES (Defined via schema.index as required)
 * Constraint: NO UNNECESSARY INDEXES. Only create strictly required indexes.
 * ============================================================================
 */

// 1. Compound Index for User Note Listing & Pagination:
// Required for: A user viewing their own list of notes sorted by creation date with pagination.
// Query pattern: find({ owner: userId }).sort({ createdAt: -1 }).skip(...).limit(...)
// Follows ESR rule (Equality on 'owner', Sort on 'createdAt').
NoteSchema.index({ owner: 1, createdAt: -1 });

// 2. Index for Global Admin Note Listing:
// Required for: Admin listing all notes across the entire platform sorted by newest with pagination.
// Query pattern: find({}).sort({ createdAt: -1 }).skip(...).limit(...)
NoteSchema.index({ createdAt: -1 });
