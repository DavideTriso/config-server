import TokenInterface from "../../database/types/TokenInterface";

type CreateTokenResultType = {
    authorizationToken: string;
    token: TokenInterface;
}
export default CreateTokenResultType;