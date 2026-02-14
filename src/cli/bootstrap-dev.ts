#!/usr/bin/env node

import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { Model } from 'mongoose';

dotenv.config();

import db from '../database/DatabaseConnection';
import { ConfigurationModel, TokenModel } from '../database/schemas';

const NAMESPACED_COLLECTION_NOT_FOUND = 26;

async function dropCollectionIndexes(model: Model<any>, collectionName: string): Promise<void> {
    try {
        await model.collection.dropIndexes();
        console.log(`${collectionName} indexes dropped`);
    } catch (error) {
        console.log(`No indexes to drop for ${collectionName}`);
    }
}

async function dropCollection(model: Model<any>, collectionName: string): Promise<void> {
    try {
        await model.collection.drop();
        console.log(`${collectionName} collection dropped`);
    } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code === NAMESPACED_COLLECTION_NOT_FOUND) {
            console.log(`${collectionName} collection did not exist`);
            return;
        }
        throw error;
    }
}

async function dropCollectionWithIndexes(model: Model<any>, collectionName: string): Promise<void> {
    console.log(`Dropping ${collectionName} collection...`);
    await dropCollectionIndexes(model, collectionName);
    await dropCollection(model, collectionName);
}

async function recreateCollectionIndexes(model: Model<any>, collectionName: string): Promise<void> {
    await model.createIndexes();
    console.log(`${collectionName} collection recreated with indexes`);
}

function runSeedCommand(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('\nRunning seed command...\n');

        const seed = spawn('npm', ['run', 'seed'], {
            stdio: 'inherit',
            shell: true
        });

        seed.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Seed command exited with code ${code}`));
            }
        });

        seed.on('error', reject);
    });
}

async function bootstrapDev(): Promise<void> {
    try {
        console.log('Starting development environment bootstrap...\n');

        console.log('Connecting to database...');
        await db.connect();
        console.log('Connected to database\n');

        await dropCollectionWithIndexes(ConfigurationModel, 'Configurations');
        await dropCollectionWithIndexes(TokenModel, 'Tokens');

        console.log('\nRecreating collections with indexes...');
        await recreateCollectionIndexes(ConfigurationModel, 'Configurations');
        await recreateCollectionIndexes(TokenModel, 'Tokens');

        await db.disconnect();
        await runSeedCommand();

        console.log('\nDevelopment environment bootstrap completed!\n');

    } catch (error) {
        console.error('\nError bootstrapping development environment:', error);
        process.exit(1);
    }
}

bootstrapDev().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
