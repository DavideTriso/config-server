#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import databaseConnection from './DatabaseConnection';
import { ConfigurationSchema } from '../document/ConfigurationModel';
import { TokenSchema } from '../document/TokenModel';
import { configurationsData } from '../seeds/configurations.seed';
import { tokensData } from '../seeds/tokens.seed';
import { SeedOptionsInterface } from './types/SeedOptionsInterface';

dotenv.config();

const program = new Command();

async function clearCollection(model: typeof ConfigurationSchema | typeof TokenSchema, name: string): Promise<void> {
    console.log(`  Clearing existing ${name}...`);
    await model.deleteMany();
}

async function seedConfigurations(clear: boolean = false): Promise<void> {
    console.log('\nSeeding configurations...');

    if (clear) {
        await clearCollection(ConfigurationSchema, 'configurations');
    }

    console.log(`  Inserting ${configurationsData.length} configurations...`);
    await ConfigurationSchema.insertMany(configurationsData);

    const count = await ConfigurationSchema.countDocuments();
    console.log(`  Configurations seeded successfully. Total: ${count}`);
}

function displayGeneratedTokens(tokens: typeof tokensData): void {
    console.log('\n  Generated tokens for testing:');
    for (const token of tokens) {
        const tokenName = token.name || 'Unknown Token';
        const tokenValue = token.token || '';
        console.log(`     Name: ${tokenName.padEnd(25)} | Token: ${tokenValue}`);
    }
}

async function seedTokens(clear: boolean = false): Promise<void> {
    console.log('\nSeeding tokens...');

    if (clear) {
        await clearCollection(TokenSchema, 'tokens');
    }

    console.log(`  Inserting ${tokensData.length} tokens...`);
    const insertedTokens = await TokenSchema.insertMany(tokensData);

    const count = await TokenSchema.countDocuments();
    console.log(`  Tokens seeded successfully. Total: ${count}`);

    displayGeneratedTokens(insertedTokens);
}

function parseCollections(options: SeedOptionsInterface): string[] {
    return options.collections?.split(',').map((c: string) => c.trim().toLowerCase()) || ['all'];
}

function shouldSeedCollection(collections: string[], collectionName: string): boolean {
    return collections.includes('all') || collections.includes(collectionName);
}

async function seedDatabase(options: SeedOptionsInterface): Promise<void> {
    try {
        console.log('Connecting to database...');
        await databaseConnection.connect();
        console.log('Connected to database');

        const collections = parseCollections(options);

        if (shouldSeedCollection(collections, 'configurations')) {
            await seedConfigurations(options.clear);
        }

        if (shouldSeedCollection(collections, 'tokens')) {
            await seedTokens(options.clear);
        }

        console.log('\nDatabase seeding completed successfully.\n');
    } catch (error) {
        console.error('\nError seeding database:', error);
        process.exit(1);
    } finally {
        await databaseConnection.disconnect();
    }
}

program
    .name('seed')
    .description('Seed the database with test data for development')
    .option('-c, --clear', 'Clear existing data before seeding', false)
    .option(
        '--collections <collections>',
        'Comma-separated list of collections to seed (configurations, tokens, or all)',
        'all'
    )
    .action(async (options: SeedOptionsInterface) => {
        await seedDatabase(options);
    });

program.parse(process.argv);
