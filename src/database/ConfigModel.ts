import { ConfigurationModel } from './schemas';
import { ConfigurationInterface, ConfigurationUpsertResultInterface } from '../types';

export class ConfigModel {
    async findByKeyAndUserId(key: string, userId: string): Promise<ConfigurationInterface | null> {
        const config = await ConfigurationModel.findOne({ key, userId }).lean<ConfigurationInterface>();
        return config;
    }

    private buildUpsertFilter(key: string, userId: string | null) {
        return userId ? { key, userId } : { key, userId: { $exists: false } };
    }

    private buildSetData(key: string, userId: string | null, value: unknown) {
        const setData: {
            key: string;
            value: unknown;
            updatedAt: Date;
            userId?: string;
        } = {
            key,
            value,
            updatedAt: new Date()
        };

        if (userId) {
            setData.userId = userId;
        }

        return setData;
    }

    async upsert(key: string, userId: string | null, value: unknown): Promise<ConfigurationUpsertResultInterface> {
        const filter = this.buildUpsertFilter(key, userId);
        const setData = this.buildSetData(key, userId, value);

        const result = await ConfigurationModel.updateOne(
            filter,
            {
                $set: setData,
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        return {
            key,
            userId: userId || undefined,
            value,
            updatedAt: new Date(),
            upserted: result.upsertedCount > 0
        };
    }

    async findByUserId(userId: string): Promise<ConfigurationInterface[]> {
        const configs = await ConfigurationModel.find({ userId }).lean<ConfigurationInterface[]>();
        return configs;
    }

    private async findAllUserConfigs(userId: string): Promise<ConfigurationInterface[]> {
        return await ConfigurationModel.find({ userId }).limit(1000).lean<ConfigurationInterface[]>();
    }

    private async findUserConfigsByKeys(userId: string, keys: string[]): Promise<ConfigurationInterface[]> {
        return await ConfigurationModel.find({
            userId,
            key: { $in: keys }
        }).lean<ConfigurationInterface[]>();
    }

    private getFoundKeys(configs: ConfigurationInterface[]): Set<string> {
        return new Set<string>(configs.map((c: ConfigurationInterface) => c.key));
    }

    private getMissingKeys(keys: string[], foundKeys: Set<string>): string[] {
        return keys.filter((k: string) => !foundKeys.has(k));
    }

    private async findDefaultConfigsByKeys(keys: string[]): Promise<ConfigurationInterface[]> {
        return await ConfigurationModel.find({
            userId: { $exists: false },
            key: { $in: keys }
        }).lean<ConfigurationInterface[]>();
    }

    async findByUserIdAndKeys(userId: string, keys?: string[]): Promise<ConfigurationInterface[]> {
        if (!keys || keys.length === 0) {
            return await this.findAllUserConfigs(userId);
        }

        const userConfigs = await this.findUserConfigsByKeys(userId, keys);
        const foundKeys = this.getFoundKeys(userConfigs);
        const missingKeys = this.getMissingKeys(keys, foundKeys);

        if (missingKeys.length === 0) {
            return userConfigs;
        }

        const defaultConfigs = await this.findDefaultConfigsByKeys(missingKeys);
        return [...userConfigs, ...defaultConfigs];
    }
}
