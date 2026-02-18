import TokenInterface from "../database/types/TokenInterface";
import CreateTokenInputInterface from "./types/CreateTokenInputInterface";
import { TokenModel as DatabaseTokenModel } from "../database/TokenModel";
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import ExpireTokenInputInterface from "./types/ExpireTokenInputInterface";
import UnauthorizedError from "./errors/UnauthorizedError";
import TokenValidator from "./validators/TokenValidator";
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import CreateTokenResultType from "./types/CreateTokenResultType";
import ParsedAuthorizationTokenType from "./types/ParsedAuthorizationTokenType";
import InternalServerError from "./errors/InternalServerError";
import dotenv from 'dotenv';

dotenv.config();


export default class TokenModel {

    private static readonly saltRounds: number = 10;

    public static async create(input: CreateTokenInputInterface): Promise<CreateTokenResultType> {
        TokenValidator.validateCreateTokenInput(input);

        const key = this.generateKey();
        const unhashedPassword = this.generatePassword();
        const password = await this.hashPassword(unhashedPassword);

        const _input = {
            ...input,
            key: key,
            password: password,
            expired: false,
            expiredOnDateTime: null,
        }

        const token = await DatabaseTokenModel.create(_input);
        const authorizationToken = this.generateAuthorizationToken(token, unhashedPassword);
        return { authorizationToken, token };
    }

    public static async expire(input: ExpireTokenInputInterface): Promise<TokenInterface | null> {
        return DatabaseTokenModel
            .findOneAndUpdate(
                { key: input.key, expired: false },
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

        await DatabaseTokenModel.deleteMany({});
    }

    private static async findByKey(filters: { key: string, expired: boolean }): Promise<TokenInterface | null> {
        return await DatabaseTokenModel
            .findOne(filters)
            .lean<TokenInterface | null>();
    }

    public static async checkAuthorization(authorizationToken: string | null): Promise<void> {
        const { key, password, name, hmac } = this.parseAuthorizationToken(authorizationToken ?? '');

        if (!this.isValidAuthorizationToken({ key, password, name, hmac })) {
            throw new UnauthorizedError();
        }

        const tokenDocument = await this.findByKey({ key: key ?? '', expired: false });

        if (!tokenDocument) {
            throw new UnauthorizedError();
        }

        const isValidPassword = await this.isValidPassword(password ?? '', tokenDocument.password);
        if (!isValidPassword) {
            throw new UnauthorizedError();
        }
    }

    public static getNameFromAuthorizationToken(authorizationToken: string | null): string {
        const { key, password, name, hmac } = this.parseAuthorizationToken(authorizationToken ?? '');
        if (!this.isValidAuthorizationToken({ key, password, name, hmac })) {
            throw new UnauthorizedError();
        }

        return name;
    }

    private static generateKey(): string {
        return randomUUID();
    }

    private static generatePassword(): string {
        return randomBytes(64).toString('hex');
    }

    private static async hashPassword(password: string): Promise<string> {
        const hashedPassword = await bcrypt.hash(password, this.saltRounds);
        return hashedPassword;
    }

    private static generateAuthorizationToken(token: TokenInterface, unhashedPassword: string): string {
        const key = Buffer.from(token.key).toString('base64');
        const name = Buffer.from(token.name).toString('base64');
        const password = Buffer.from(unhashedPassword).toString('base64');
        const authorizationTokenWithoutHmac = `${key}:${name}:${password}`;
        const hmac = Buffer.from(this.getHmac(authorizationTokenWithoutHmac), 'hex').toString('base64');
        return `${authorizationTokenWithoutHmac}:${hmac}`;
    }

    private static parseAuthorizationToken(authorizationToken: string): ParsedAuthorizationTokenType {
        const authorizationTokenParts = authorizationToken.split(':');
        if (authorizationTokenParts.length !== 4) {
            throw new UnauthorizedError();
        }

        try {
            const key = Buffer.from(authorizationTokenParts[0], 'base64').toString('utf-8');
            const name = Buffer.from(authorizationTokenParts[1], 'base64').toString('utf-8');
            const password = Buffer.from(authorizationTokenParts[2], 'base64').toString('utf-8');
            const hmac = Buffer.from(authorizationTokenParts[3], 'base64').toString('hex');
            return { key, name, password, hmac };
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
        const { key, name, password, hmac } = parsedAuthorizationToken;

        const keyBase64 = Buffer.from(key).toString('base64');
        const nameBase64 = Buffer.from(name).toString('base64');
        const passwordBase64 = Buffer.from(password).toString('base64');
        const authorizationTokenWithoutHmac = `${keyBase64}:${nameBase64}:${passwordBase64}`;

        const expectedHmac = this.getHmac(authorizationTokenWithoutHmac);

        const hmacBuffer = Buffer.from(hmac, 'hex');
        const expectedHmacBuffer = Buffer.from(expectedHmac, 'hex');

        if (hmacBuffer.length !== expectedHmacBuffer.length) {
            return false;
        }

        return timingSafeEqual(hmacBuffer, expectedHmacBuffer);
    }
}