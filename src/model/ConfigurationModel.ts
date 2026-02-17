import ConfigurationInterface from "../database/types/ConfigurationInterface";
import UpsertConfigurationInputInterface from "./types/UpsertConfigurationInputInterface";
import { ConfigurationModel as DatabaseConfigurationModel } from "../database/ConfigurationModel";
import TokenModel from "./TokenModel";
import { z } from 'zod';
import ConfiguratioValidator from "./validators/ConfiguratioValidator";


export default class ConfigurationModel {
    public static async upsert(
        input: UpsertConfigurationInputInterface,
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<ConfigurationInterface | null> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(token, false);
        }

        ConfiguratioValidator.validateUpsertInput(input);

        const now = new Date();
        const _input = {
            ...input,
            updatedOnDateTime: now,
            updatedBy: token ?? 'anonymous'
        }

        return DatabaseConfigurationModel
            .findOneAndUpdate(
                { key: input.key, userId: input.userId },
                {
                    $set: _input,
                    $setOnInsert: { createdOnDateTime: now, createdBy: token ?? 'anonymous' }
                },
                { upsert: true, returnDocument: 'after' }
            )
            .lean<ConfigurationInterface>();
    }

    public static async deleteAll(
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<void> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(token, false);
        }

        await DatabaseConfigurationModel.deleteMany({});
    }

    public static async findByUserIdAndKeys(
        filters: { userId: string, keys?: string[] },
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<ConfigurationInterface[]> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(token, false);
        }

        return await DatabaseConfigurationModel
            .find({ userId: filters.userId, ...(filters.keys ? { key: { $in: filters.keys } } : {}) })
            .lean<ConfigurationInterface[]>();
    }
}