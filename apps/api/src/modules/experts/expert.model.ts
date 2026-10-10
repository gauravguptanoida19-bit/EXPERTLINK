import mongoose, { Schema, Document } from 'mongoose';

export interface IPastEngagement {
  topic: string;
  company: string;
  year: number;
}

export interface IExpertProfile extends Document {
  userId: string;
  name?: string;
  email?: string;
  headline: string;
  bio: string;
  industries: string[];
  skills: string[];
  yearsExperience: number;
  pastEngagements: IPastEngagement[];
  hourlyRateUsd: number;
  availability: string[];
  embedding: number[];
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const PastEngagementSchema = new Schema<IPastEngagement>(
  {
    topic: { type: String, required: true },
    company: { type: String, required: true },
    year: { type: Number, required: true }
  },
  { _id: false }
);

export const ExpertProfileSchema = new Schema<IExpertProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    email: { type: String },
    headline: { type: String, required: true },
    bio: { type: String, required: true },
    industries: [{ type: String, index: true }],
    skills: [{ type: String, index: true }],
    yearsExperience: { type: Number, required: true, min: 0 },
    pastEngagements: [PastEngagementSchema],
    hourlyRateUsd: { type: Number, required: true, min: 0 },
    availability: [{ type: String }],
    embedding: { type: [Number], default: [] },
    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 }
  },
  { timestamps: true }
);

// MongoDB text search index for keyword/hybrid search
ExpertProfileSchema.index({ headline: 'text', bio: 'text', skills: 'text' });

export const ExpertProfile =
  mongoose.models.ExpertProfile ||
  mongoose.model<IExpertProfile>('ExpertProfile', ExpertProfileSchema);
