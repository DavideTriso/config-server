import { ObjectId } from 'mongodb';

// Configuration Types
export interface Configuration {
  _id?: ObjectId;
  key: string;
  userId: string;
  value: any; // JSON value
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConfigurationUpsertResult {
  key: string;
  userId: string;
  value: any;
  updatedAt: Date;
  upserted: boolean;
}

// Token Types
export interface Token {
  _id: ObjectId;
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
