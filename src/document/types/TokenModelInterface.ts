import { Model } from "mongoose";
import { TokenDocumentInterface } from "./TokenDocumentInterface";
import { TokenInterface } from "./TokenInterface";
import { TokenCreateInputInterface } from "./TokenCreateInputInterface";
import { TokenUpdateInputInterface } from "./TokenUpdateInputInterface";

export default interface TokenModelInterface extends Model<TokenDocumentInterface> {
    createToken(tokenData: TokenCreateInputInterface): Promise<TokenInterface>;
    findByToken(token: string): Promise<TokenInterface | null>;
    updateTokenById(id: string, updateData: Partial<TokenUpdateInputInterface>): Promise<boolean>;
}
