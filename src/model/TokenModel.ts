import TokenInterface from "../database/types/TokenInterface";
import CreateTokenInputInterface from "./types/CreateTokenInputInterface";
import DatabaseTokenModel from "../database/TokenModel";
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import ExpireTokenInputInterface from "./types/ExpireTokenInputInterface";
import UnauthorizedError from "./errors/UnauthorizedError";
import TokenValidator from "./validators/TokenValidator";
import bcrypt from 'bcrypt';
import CreateTokenResultType from "./types/CreateTokenResultType";
import ParsedAuthorizationTokenType from "./types/ParsedAuthorizationTokenType";
import InternalServerError from "./errors/InternalServerError";
import dotenv from 'dotenv';
import DuplicateEntryError from "./errors/DuplicaException";

dotenv.config();


export default class TokenModel {

    private static readonly saltRounds: number = 10;

    public static async create(input: CreateTokenInputInterface): Promise<CreateTokenResultType> {
        TokenValidator.validateCreateTokenInput(input);

        const unhashedPassword = this.generatePassword();
        const password = await this.hashPassword(unhashedPassword);

        const _input = {
            ...input,
            password: password,
            expired: false,
            expiredOnDateTime: null,
        }

        try {
            const token = await DatabaseTokenModel.getModel().create(_input);
            const authorizationToken = this.generateAuthorizationToken(token, unhashedPassword);
            return { authorizationToken, token };
        } catch (error: any) {
            if (error.code === 11000) {
                throw new DuplicateEntryError(`Token with name '${input.name}' already exists`);
            }
            throw error;
        }
    }

    public static async expire(input: ExpireTokenInputInterface): Promise<TokenInterface | null> {
        return DatabaseTokenModel
            .getModel()
            .findOneAndUpdate(
                { name: input.name, expired: false },
                {
                    $set: {
                        expired: true,
                        expiredOnDateTime: new Date(),
                    }
                },
                { returnDocument: 'after' }
            )
            .lean();
    }

    /**
     * @internal
     * @throws InternalServerError if called without the exact argument to prevent accidental misuse.
     */
    public static async deleteAll(iAmAwareThisIsAnInternalMethod: boolean): Promise<void> {
        if (!iAmAwareThisIsAnInternalMethod) {
            throw new InternalServerError("This method is internal.");
        }

        await DatabaseTokenModel.getModel().deleteMany({});
    }

    private static async findByName(filters: { name: string, expired: boolean }): Promise<TokenInterface | null> {
        return await DatabaseTokenModel
            .getModel()
            .findOne(filters)
            .lean<TokenInterface | null>();
    }

    public static async checkAuthorization(authorizationToken: string | null): Promise<void> {
        const { password, name, hmac } = this.parseAuthorizationToken(authorizationToken ?? '');

        if (!this.isValidAuthorizationToken({ password, name, hmac })) {
            throw new UnauthorizedError();
        }

        const tokenDocument = await this.findByName({ name: name ?? '', expired: false });

        if (!tokenDocument) {
            throw new UnauthorizedError();
        }

        const isValidPassword = await this.isValidPassword(password ?? '', tokenDocument.password);
        if (!isValidPassword) {
            throw new UnauthorizedError();
        }
    }

    public static getNameFromAuthorizationToken(authorizationToken: string | null): string {
        const { password, name, hmac } = this.parseAuthorizationToken(authorizationToken ?? '');
        if (!this.isValidAuthorizationToken({ password, name, hmac })) {
            throw new UnauthorizedError();
        }

        return name;
    }

    private static generatePassword(): string {
        return randomBytes(64).toString('hex');
    }

    private static async hashPassword(password: string): Promise<string> {
        const hashedPassword = await bcrypt.hash(password, this.saltRounds);
        return hashedPassword;
    }

    private static generateAuthorizationToken(token: TokenInterface, unhashedPassword: string): string {
        const name = Buffer.from(token.name).toString('base64');
        const password = Buffer.from(unhashedPassword).toString('base64');
        const authorizationTokenWithoutHmac = `${name}:${password}`;
        const hmac = Buffer.from(this.getHmac(authorizationTokenWithoutHmac), 'hex').toString('base64');
        return `${authorizationTokenWithoutHmac}:${hmac}`;
    }

    private static parseAuthorizationToken(authorizationToken: string): ParsedAuthorizationTokenType {
        const authorizationTokenParts = authorizationToken.split(':');
        if (authorizationTokenParts.length !== 3) {
            throw new UnauthorizedError();
        }

        try {
            const name = Buffer.from(authorizationTokenParts[0], 'base64').toString('utf-8');
            const password = Buffer.from(authorizationTokenParts[1], 'base64').toString('utf-8');
            const hmac = Buffer.from(authorizationTokenParts[2], 'base64').toString('hex');
            return { name, password, hmac };
        } catch (error) {
            throw new UnauthorizedError();
        }
    }

    private static async isValidPassword(unhashedPassword: string, password: string): Promise<boolean> {
        return await bcrypt.compare(unhashedPassword, password);
    }

    private static getHmac(value: string): string {
        const secretKey = process.env.APP_SECRET;
        if (!secretKey) {
            throw new InternalServerError('M.TM.t: server configuration error - add missing environment variable.');
        }
        return createHmac('sha512', secretKey).update(value).digest('hex')
    }

    private static isValidAuthorizationToken(parsedAuthorizationToken: ParsedAuthorizationTokenType): boolean {
        const { name, password, hmac } = parsedAuthorizationToken;

        const nameBase64 = Buffer.from(name).toString('base64');
        const passwordBase64 = Buffer.from(password).toString('base64');
        const authorizationTokenWithoutHmac = `${nameBase64}:${passwordBase64}`;

        const expectedHmac = this.getHmac(authorizationTokenWithoutHmac);

        const hmacBuffer = Buffer.from(hmac, 'hex');
        const expectedHmacBuffer = Buffer.from(expectedHmac, 'hex');

        if (hmacBuffer.length !== expectedHmacBuffer.length) {
            return false;
        }

        return timingSafeEqual(hmacBuffer, expectedHmacBuffer);
    }
}