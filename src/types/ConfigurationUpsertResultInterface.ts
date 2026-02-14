export interface ConfigurationUpsertResultInterface {
    key: string;
    userId?: string;
    value: unknown;
    updatedAt: Date;
    upserted: boolean;
}
