export interface TokenCreateInputInterface {
    token: string;
    name: string;
    active: boolean;
    expiresAt?: Date;
}
