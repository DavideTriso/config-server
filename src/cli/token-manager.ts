import dotenv from 'dotenv';

dotenv.config();

import { program } from 'commander';
import TokenModel from '../model/TokenModel';

program.name('token-manager').description('CLI for managing tokens').version('1.0.0');


program
    .command('create')
    .description('Create a new token')
    .argument('<name>', 'Name of the token')
    .action(async (name: string): Promise<void> => {
        try {
            const createResult = await TokenModel.create({ name });
            console.log(`${createResult.token.name}: ${createResult.authorizationToken}\n`);
        } catch (error) {
            console.error('Failed to create token:', error);
            process.exit(1);
        }
    });

program
    .command('expire')
    .description('Expire an existing token')
    .argument('<name>', 'Name of the token')
    .action(async (name: string): Promise<void> => {
        try {
            await TokenModel.expire({ name });
            console.log(`Token with name "${name}" has been expired.`);
        } catch (error) {
            console.error('Failed to expire token:', error);
            process.exit(1);
        }
    });