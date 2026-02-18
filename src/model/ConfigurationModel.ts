import ConfigurationInterface from "../database/types/ConfigurationInterface";
import UpsertConfigurationInputInterface from "./types/UpsertConfigurationInputInterface";
import { ConfigurationModel as DatabaseConfigurationModel } from "../database/ConfigurationModel";
import TokenModel from "./TokenModel";
import ConfigurationValidator from "./validators/ConfigurationValidator";
import Users from "./constants/Users";
import InternalServerError from "./errors/InternalServerError";

export default class ConfigurationModel {

    public static async upsert(
        input: UpsertConfigurationInputInterface,
        checkAuthorization: boolean = true,
        authorizationToken: string | null = null
    ): Promise<ConfigurationInterface | null> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(authorizationToken);
        }

        ConfigurationValidator.validateUpsertInput(input);

        const now = new Date();
        const userName = authorizationToken
            ? (TokenModel.getNameFromAuthorizationToken(authorizationToken) ?? Users.ANONYMOUS)
            : Users.ANONYMOUS;

        return DatabaseConfigurationModel
            .findOneAndUpdate(
                { key: input.key, userId: input.userId },
                {
                    $set: {
                        ...input,
                        lastUpdatedOnDateTime: now,
                        lastUpdatedBy: userName
                    },
                    $setOnInsert: {
                        createdOnDateTime: now,
                        createdBy: userName
                    }
                },
                { upsert: true, returnDocument: 'after' }
            )
            .lean<ConfigurationInterface>();
    }

    public static async deleteAll(iAmAwareThisIsAnInternalMethod: boolean): Promise<void> {
        if (!iAmAwareThisIsAnInternalMethod) {
            throw new InternalServerError("This method is internal.");
        }

        await DatabaseConfigurationModel.deleteMany({});
    }

    public static async findByUserIdAndKeys(
        filters: { userId: string, keys?: string[] },
        checkAuthorization: boolean = true,
        authorizationToken: string | null = null
    ): Promise<ConfigurationInterface[]> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(authorizationToken);
        }

        return await DatabaseConfigurationModel
            .find({
                userId: filters.userId,
                ...(filters.keys && filters.keys.length > 0 ? { key: { $in: filters.keys } } : {})
            })
            .lean<ConfigurationInterface[]>();
    }
}