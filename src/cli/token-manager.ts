import dotenv from 'dotenv';

dotenv.config();

import { program } from 'commander';
import TokenModel from '../model/TokenModel';
import DatabaseConnection from '../database/DatabaseConnection';

program.name('token-manager').description('CLI for managing tokens').version('1.0.0');

program
    .command('create')
    .description('Create a new token')
    .argument('name', 'Name of the token')
    .action(async (name: string): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            const createResult = await TokenModel.create({ name }, true);
            console.log(`\n\nToken created successfully:\n Name: ${createResult.token.name}\n Token: ${createResult.authorizationToken}\n\n`);
            process.exit(0);
        } catch (error) {
            console.error('Failed to create token:', error);
            process.exit(1);
        }
    });

program
    .command('expire')
    .description('Expire an existing token')
    .argument('name', 'Name of the token')
    .action(async (name: string): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            await TokenModel.expire({ name }, true);
            console.log(`Token with name "${name}" has been expired.`);
            process.exit(0);
        } catch (error) {
            console.error('Failed to expire token:', error);
            process.exit(1);
        }
    });

program
    .command('delete-all-expired')
    .description('Delete all expired tokens')
    .action(async (): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            await TokenModel.deleteAllExpired(true);
            console.log('All expired tokens have been deleted.');
            process.exit(0);
        } catch (error) {
            console.error('Failed to delete expired tokens:', error);
            process.exit(1);
        }
    });

program
    .command('delete')
    .description('Delete an expired token')
    .argument('name', 'Name of the token')
    .action(async (name: string): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            const result = await TokenModel.delete({ name }, true);
            if (result) {
                console.log(`Token with name "${name}" has been deleted.`);
                process.exit(0);
            }
            console.log(`The token "${name}" does not exist or is not expired. Expire the token before deleting it.`);
            process.exit(1);
        } catch (error) {
            console.error(`Failed to delete token with name "${name}":`, error);
            process.exit(1);
        }
    });

program
    .command('list')
    .description('List all tokens')
    .action(async (): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            const tokens = await TokenModel.findAll(true);
            console.table(
                tokens.map(token => ({ Name: token.name, Expired: token.expired, ExpiredOn: token.expiredOnDateTime?.toISOString() ?? "N/A" }))
            );
            process.exit(0);
        } catch (error) {
            console.error('Failed to list tokens:', error);
            process.exit(1);
        }
    });

program.parse();