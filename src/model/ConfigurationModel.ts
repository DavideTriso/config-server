import ConfigurationInterface from "../database/types/ConfigurationInterface";
import UpsertConfigurationInputInterface from "./types/UpsertConfigurationInputInterface";
import DatabaseConfigurationModel from "../database/ConfigurationModel";
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
            .getModel()
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

        await DatabaseConfigurationModel.getModel().deleteMany({});
    }

    public static async deleteByKey(
        filters: { key: string },
        checkAuthorization: boolean = true,
        authorizationToken: string | null = null
    ): Promise<void> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(authorizationToken);
        }

        await DatabaseConfigurationModel.getModel().deleteMany({ key: filters.key });
    }

    public static async deleteByUserId(
        filters: { userId: string },
        checkAuthorization: boolean = true,
        authorizationToken: string | null = null
    ): Promise<void> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(authorizationToken);
        }

        await DatabaseConfigurationModel.getModel().deleteMany({ userId: filters.userId });
    }

    public static async deleteByKeyAndUserId(
        filters: { key: string, userId: string },
        checkAuthorization: boolean = true,
        authorizationToken: string | null = null
    ): Promise<void> {
        if (checkAuthorization) {
            await TokenModel.checkAuthorization(authorizationToken);
        }

        await DatabaseConfigurationModel
            .getModel()
            .deleteMany({ key: filters.key, userId: filters.userId });
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
            .getModel()
            .find({
                userId: filters.userId,
                ...(filters.keys && filters.keys.length > 0 ? { key: { $in: filters.keys } } : {})
            })
            .lean<ConfigurationInterface[]>();
    }
}