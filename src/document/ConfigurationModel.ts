import mongoose, { Schema, Model } from 'mongoose';
import { ConfigurationDocumentInterface } from './types/ConfigurationDocumentInterface';
import { ConfigurationInterface, ConfigurationUpsertResultInterface } from '../types';
import ConfigurationModelInterface from './types/ConfigurationModelInterface';


const configurationSchema = new Schema<ConfigurationDocumentInterface, ConfigurationModelInterface>(
    {
        key: { type: String, required: true },
        userId: { type: String, sparse: true },
        value: { type: Schema.Types.Mixed, required: true },
    },
    {
        timestamps: true,
        collection: 'configurations'
    }
);

// Compound index for efficient querying
configurationSchema.index(
    { key: 1, userId: 1 },
    { name: 'idx_key_userId', unique: true, sparse: true }
);
configurationSchema.index(
    { userId: 1 },
    { name: 'idx_userId' }
);
configurationSchema.index(
    { key: 1 },
    { name: 'idx_key' }
);

// Static methods
configurationSchema.statics.findByKeyAndUserId = async function (
    key: string,
    userId: string | null
): Promise<ConfigurationInterface | null> {
    const config = await this.findOne({ key, userId }).lean<ConfigurationInterface>();
    return config;
};

configurationSchema.statics.upsertConfiguration = async function (
    key: string,
    userId: string | null,
    value: unknown
): Promise<ConfigurationUpsertResultInterface> {
    const filter = userId ? { key, userId } : { key, userId: { $exists: false } };
    const setData: any = {
        key,
        value,
        updatedAt: new Date()
    };

    if (userId) {
        setData.userId = userId;
    }

    const result = await this.updateOne(
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
};

configurationSchema.statics.findByUserId = async function (
    userId: string
): Promise<ConfigurationInterface[]> {
    const configs = await this.find({ userId }).lean<ConfigurationInterface[]>();
    return configs;
};

configurationSchema.statics.findByUserIdAndKeys = async function (
    userId: string,
    keys?: string[]
): Promise<ConfigurationInterface[]> {
    // Helper: find all user configs
    const findAllUserConfigs = async (): Promise<ConfigurationInterface[]> => {
        return await this.find({ userId }).limit(1000).lean<ConfigurationInterface[]>();
    };

    // Helper: find user configs by keys
    const findUserConfigsByKeys = async (keys: string[]): Promise<ConfigurationInterface[]> => {
        return await this.find({
            userId,
            key: { $in: keys }
        }).lean<ConfigurationInterface[]>();
    };

    // Helper: find default configs by keys
    const findDefaultConfigsByKeys = async (keys: string[]): Promise<ConfigurationInterface[]> => {
        return await this.find({
            userId: { $exists: false },
            key: { $in: keys }
        }).lean<ConfigurationInterface[]>();
    };

    if (!keys || keys.length === 0) {
        return await findAllUserConfigs();
    }

    const userConfigs = await findUserConfigsByKeys(keys);
    const foundKeys = new Set<string>(userConfigs.map((c: ConfigurationInterface) => c.key));
    const missingKeys = keys.filter((k: string) => !foundKeys.has(k));

    if (missingKeys.length === 0) {
        return userConfigs;
    }

    const defaultConfigs = await findDefaultConfigsByKeys(missingKeys);
    return [...userConfigs, ...defaultConfigs];
};

configurationSchema.statics.upsertDefaultConfigurations = async function (
    configurations: Array<{ key: string; value: unknown }>
): Promise<ConfigurationInterface[]> {
    const results: ConfigurationInterface[] = [];

    for (const config of configurations) {
        const filter = { key: config.key, userId: { $exists: false } };
        const setData = {
            key: config.key,
            value: config.value,
            updatedAt: new Date()
        };

        await this.updateOne(
            filter,
            {
                $set: setData,
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        // Fetch the upserted document to return it
        const upserted = await this.findOne(filter).lean<ConfigurationInterface>();
        if (upserted) {
            results.push(upserted);
        }
    }

    return results;
};

export const ConfigurationModel = mongoose.model<ConfigurationDocumentInterface, ConfigurationModelInterface>(
    'Configuration',
    configurationSchema
);
