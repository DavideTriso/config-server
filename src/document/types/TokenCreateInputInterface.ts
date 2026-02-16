export interface TokenCreateInputInterface {
    name: string;
    active: boolean;
    admin?: boolean;
    expiresAt?: Date;
}
