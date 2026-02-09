import { Types } from 'mongoose';

// Configuration Types
export interface Configuration {
  _id?: Types.ObjectId;
  key: string;
  userId?: string;
  value: unknown; // JSON value - can be any valid JSON type
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConfigurationUpsertResult {
  key: string;
  userId?: string;
  value: unknown;
  updatedAt: Date;
  upserted: boolean;
}

// Token Types
export interface Token {
  _id: Types.ObjectId;
  token: string;
  userId: string;
  name: string;
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenCreateInput {
  token: string;
  userId: string;
  name: string;
  active: boolean;
  expiresAt?: Date;
}

// Authentication Context
export interface AuthContext {
  userId: string | null;
}

// GraphQL Resolver Context
export interface ResolverContext {
  userId: string | null;
}
