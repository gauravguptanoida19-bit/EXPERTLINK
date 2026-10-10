import mongoose, { Schema, Document } from 'mongoose';

export interface IQueryLog extends Document {
  queryId: string;
  rawText: string;
  timingsMs: {
    embed: number;
    rank: number;
    total: number;
  };
  topExpertIds: string[];
  createdAt: Date;
}

export const QueryLogSchema = new Schema<IQueryLog>(
  {
    queryId: { type: String, required: true, index: true },
    rawText: { type: String, required: true },
    timingsMs: {
      embed: { type: Number, required: true },
      rank: { type: Number, required: true },
      total: { type: Number, required: true }
    },
    topExpertIds: [{ type: String }],
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

export const QueryLog =
  mongoose.models.QueryLog || mongoose.model<IQueryLog>('QueryLog', QueryLogSchema);
