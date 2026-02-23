import dotenv from 'dotenv';

dotenv.config();

import { program } from 'commander';
import ConfigurationModel from '../model/ConfigurationModel';
import DatabaseConnection from '../database/DatabaseConnection';

program.name('configuration-manager').description('CLI for managing configurations').version('1.0.0');

program
    .command('delete')
    .description('Delete an existing configuration')
    .option('-k, --key <key>', 'Key of the configuration(s) to delete')
    .option('-u, --userId <userId>', 'User ID of the configuration(s) to delete')
    .action(async (options: { key?: string; userId?: string }): Promise<void> => {
        try {
            await DatabaseConnection.getInstance().connect();
            if (options.key && options.userId) {
                await ConfigurationModel.deleteByKeyAndUserId({ key: options.key, userId: options.userId }, false);
            } else if (options.key) {
                await ConfigurationModel.deleteByKey({ key: options.key }, false);
            } else if (options.userId) {
                await ConfigurationModel.deleteByUserId({ userId: options.userId }, false);
            } else {
                throw new Error('At least one of --key or --userId must be provided');
            }
            process.exit(0);
        } catch (error) {
            console.error('Failed to delete configuration(s):', error);
            process.exit(1);
        }
    });

program.parse();