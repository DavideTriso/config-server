import { Model } from "mongoose";
import { ConfigurationDocumentInterface } from "./ConfigurationDocumentInterface";
import { ConfigurationInterface } from "./ConfigurationInterface";

export default interface ConfigurationModelInterface extends Model<ConfigurationDocumentInterface> {
    upsertConfigurationByKeyAndUserId(key: string, userId: string, value: object | []): Promise<boolean>;
    findByUserIdAndKeys(userId: string, keys?: string[]): Promise<ConfigurationInterface[]>;
}
