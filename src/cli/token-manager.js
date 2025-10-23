#!/usr/bin/env node

const { program } = require('commander');
const crypto = require('crypto');
require('dotenv').config();

const db = require('../database/connection');
const { TokenModel } = require('../database/models');

const tokenModel = new TokenModel();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function ensureConnection() {
  if (!db.db) {
    await db.connect();
  }
}

program.name('token-manager').description('CLI for managing authentication tokens');

program
  .command('create')
  .description('Create a new token')
  .requiredOption('-u, --user-id <userId>', 'User ID for the token')
  .option('-n, --name <name>', 'Token name/description')
  .option('-e, --expires <days>', 'Token expires in X days')
  .action(async (options) => {
    try {
      await ensureConnection();
      
      const token = generateToken();
      const tokenData = {
        token,
        userId: options.userId,
        name: options.name || 'CLI Generated Token',
        active: true
      };

      if (options.expires) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(options.expires));
        tokenData.expiresAt = expiresAt;
      }

      const result = await tokenModel.create(tokenData);
      
      console.log('Token created successfully:');
      console.log(`ID: ${result._id}`);
      console.log(`Token: ${result.token}`);
      console.log(`User ID: ${result.userId}`);
      console.log(`Name: ${result.name}`);
      if (result.expiresAt) {
        console.log(`Expires: ${result.expiresAt.toISOString()}`);
      }
      
    } catch (error) {
      console.error('Error creating token:', error.message);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  });

program
  .command('list')
  .description('List all tokens')
  .option('-u, --user-id <userId>', 'Filter by user ID')
  .action(async (options) => {
    try {
      await ensureConnection();
      
      let tokens;
      if (options.userId) {
        tokens = await tokenModel.findByUserId(options.userId);
      } else {
        tokens = await tokenModel.findAll();
      }

      if (tokens.length === 0) {
        console.log('No tokens found.');
        return;
      }

      console.log('Tokens:');
      tokens.forEach(token => {
        console.log(`\nID: ${token._id}`);
        console.log(`Token: ${token.token.substring(0, 8)}...`);
        console.log(`User ID: ${token.userId}`);
        console.log(`Name: ${token.name}`);
        console.log(`Active: ${token.active}`);
        if (token.expiresAt) {
          console.log(`Expires: ${token.expiresAt.toISOString()}`);
        }
        console.log(`Created: ${token.createdAt.toISOString()}`);
      });
      
    } catch (error) {
      console.error('Error listing tokens:', error.message);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  });

program
  .command('revoke')
  .description('Revoke a token')
  .requiredOption('-t, --token <token>', 'Token to revoke')
  .action(async (options) => {
    try {
      await ensureConnection();
      
      const deleted = await tokenModel.deleteByToken(options.token);
      
      if (deleted) {
        console.log('Token revoked successfully.');
      } else {
        console.log('Token not found.');
      }
      
    } catch (error) {
      console.error('Error revoking token:', error.message);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  });

program
  .command('deactivate')
  .description('Deactivate a token (without deleting)')
  .requiredOption('-i, --id <id>', 'Token ID to deactivate')
  .action(async (options) => {
    try {
      await ensureConnection();
      
      const updated = await tokenModel.updateById(options.id, { active: false });
      
      if (updated) {
        console.log('Token deactivated successfully.');
      } else {
        console.log('Token not found.');
      }
      
    } catch (error) {
      console.error('Error deactivating token:', error.message);
      process.exit(1);
    } finally {
      await db.disconnect();
    }
  });

program.parse();