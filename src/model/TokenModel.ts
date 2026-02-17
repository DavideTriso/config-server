import TokenInterface from "../database/types/TokenInterface";
import CreateTokenInputInterface from "./types/CreateTokenInputInterface";
import { TokenModel as DatabaseTokenModel } from "../database/TokenModel";
import { randomBytes } from 'crypto';
import ExpireTokenInputInterface from "./types/ExpireTokenInputInterface";
import UnauthorizedError from "./errors/UnauthorizedError";
import TokenValidator from "./validators/TokenValidator";

export default class TokenModel {

    private static generateToken(): string {
        return randomBytes(64).toString('hex');
    }

    public static async create(
        input: CreateTokenInputInterface,
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<TokenInterface> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }

        TokenValidator.validateCreateTokenInput(input);

        const now = new Date();
        const _input = {
            ...input,
            token: this.generateToken(),
            admin: false,
            expired: false,
            createdOnDateTime: now,
            createdBy: token ?? 'anonymous',
            updatedOnDateTime: now,
            updatedBy: token ?? 'anonymous'
        }

        return await DatabaseTokenModel.create(_input);
    }

    public static async createAdmin(
        input: CreateTokenInputInterface,
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<TokenInterface> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }

        TokenValidator.validateCreateTokenInput(input);

        const now = new Date();
        const _input = {
            ...input,
            token: this.generateToken(),
            admin: true,
            expired: false,
            createdOnDateTime: now,
            createdBy: token ?? 'anonymous',
            updatedOnDateTime: now,
            updatedBy: token ?? 'anonymous'
        }

        return await DatabaseTokenModel.create(_input);
    }

    public static async expire(
        input: ExpireTokenInputInterface,
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<TokenInterface | null> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }

        return DatabaseTokenModel
            .findOneAndUpdate(
                { token: input.token, expired: false, admin: false },
                {
                    $set: {
                        expired: true,
                        updatedOnDateTime: new Date(),
                        updatedBy: token ?? 'anonymous'
                    }
                },
                { returnDocument: 'after' }
            )
            .lean();
    }

    public static async expireAdmin(
        input: ExpireTokenInputInterface,
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<TokenInterface | null> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }

        return DatabaseTokenModel
            .findOneAndUpdate(
                { token: input.token, expired: false, admin: true },
                {
                    $set: {
                        expired: true,
                        updatedOnDateTime: new Date(),
                        updatedBy: token ?? 'anonymous'
                    }
                },
                { returnDocument: 'after' }
            )
            .lean<TokenInterface>();
    }

    public static async deleteAll(
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<void> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }
        await DatabaseTokenModel.deleteMany({});
    }

    public static async findByToken(
        filters: { token: string },
        checkAuthorization: boolean = true,
        token: string | null = null
    ): Promise<TokenInterface | null> {
        if (checkAuthorization) {
            await this.checkAuthorization(token, true);
        }

        return await DatabaseTokenModel
            .findOne({ token: filters.token, expired: false })
            .lean<TokenInterface | null>();
    }

    public static async checkAuthorization(token: string | null, requireAdmin: boolean = false): Promise<void> {
        const tokenDocument = token ? await this.findByToken({ token }, false) : null;
        if (!tokenDocument) {
            throw new UnauthorizedError();
        }

        if (requireAdmin && !tokenDocument.admin) {
            throw new UnauthorizedError();
        }
    }
}