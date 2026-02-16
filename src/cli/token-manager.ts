#!/usr/bin/env node

import { program } from 'commander';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

import databaseConnection from '../database/DatabaseConnection';
import { TokenSchema } from '../document/TokenModel';
import { TokenCreateInputInterface, TokenInterface } from '../types';
import { CreateOptionsInterface } from './types/CreateOptionsInterface';
import { RevokeOptionsInterface } from './types/RevokeOptionsInterface';
import { DeactivateOptionsInterface } from './types/DeactivateOptionsInterface';

function generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

async function withDatabaseConnection<T>(callback: () => Promise<T>): Promise<T> {
    try {
        await databaseConnection.connect();
        return await callback();
    } finally {
        await databaseConnection.disconnect();
    }
}

function calculateExpirationDate(daysFromNow: number): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysFromNow);
    return expiresAt;
}

function buildTokenData(options: CreateOptionsInterface): TokenCreateInputInterface {
    const tokenData: TokenCreateInputInterface = {
        token: generateToken(),
        name: options.name || 'CLI Generated Token',
        active: true,
        admin: options.admin || false
    };

    if (options.expires) {
        tokenData.expiresAt = calculateExpirationDate(parseInt(options.expires));
    }

    return tokenData;
}

function displayTokenInfo(token: TokenInterface): void {
    console.log('Token created successfully:');
    console.log(`ID: ${token._id}`);
    console.log(`Token: ${token.token}`);
    console.log(`Name: ${token.name}`);
    if (token.expiresAt) {
        console.log(`Expires: ${token.expiresAt.toISOString()}`);
    }
}

function displayTokenList(tokens: TokenInterface[]): void {
    if (tokens.length === 0) {
        console.log('No tokens found.');
        return;
    }

    console.log('Tokens:');
    tokens.forEach(token => {
        console.log(`\nID: ${token._id}`);
        console.log(`Token: ${token.token.substring(0, 8)}...`);
        console.log(`Name: ${token.name}`);
        console.log(`Active: ${token.active}`);
        if (token.expiresAt) {
            console.log(`Expires: ${token.expiresAt.toISOString()}`);
        }
        console.log(`Created: ${token.createdAt.toISOString()}`);
    });
}

function handleError(error: unknown, operation: string): never {
    console.error(`Error ${operation}:`, (error as Error).message);
    process.exit(1);
}

async function handleCreateToken(options: CreateOptionsInterface): Promise<void> {
    try {
        await withDatabaseConnection(async () => {
            const tokenData = buildTokenData(options);
            const result = await TokenSchema.createToken(tokenData);
            displayTokenInfo(result);
        });
    } catch (error) {
        handleError(error, 'creating token');
    }
}

async function handleListTokens(): Promise<void> {
    try {
        await withDatabaseConnection(async () => {
            const tokens = await TokenSchema.findAllTokens();
            displayTokenList(tokens);
        });
    } catch (error) {
        handleError(error, 'listing tokens');
    }
}

async function handleRevokeToken(options: RevokeOptionsInterface): Promise<void> {
    try {
        await withDatabaseConnection(async () => {
            const deleted = await TokenSchema.deleteTokenByToken(options.token);
            console.log(deleted ? 'Token revoked successfully.' : 'Token not found.');
        });
    } catch (error) {
        handleError(error, 'revoking token');
    }
}

async function handleDeactivateToken(options: DeactivateOptionsInterface): Promise<void> {
    try {
        await withDatabaseConnection(async () => {
            const updated = await TokenSchema.updateTokenById(options.id, { active: false });
            console.log(updated ? 'Token deactivated successfully.' : 'Token not found.');
        });
    } catch (error) {
        handleError(error, 'deactivating token');
    }
}

program.name('token-manager').description('CLI for managing authentication tokens');

program
    .command('create')
    .description('Create a new token')
    .option('-n, --name <name>', 'Token name/description')
    .option('-e, --expires <days>', 'Token expires in X days')
    .option('-a, --admin', 'Create admin token (can manage default configurations)')
    .action(handleCreateToken);

program
    .command('list')
    .description('List all tokens')
    .action(handleListTokens);

program
    .command('revoke')
    .description('Revoke a token')
    .requiredOption('-t, --token <token>', 'Token to revoke')
    .action(handleRevokeToken);

program
    .command('deactivate')
    .description('Deactivate a token (without deleting)')
    .requiredOption('-i, --id <id>', 'Token ID to deactivate')
    .action(handleDeactivateToken);

program.parse();
