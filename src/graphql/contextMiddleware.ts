import RequestInterface from "./types/RequestInterface";
import ResolverContextInterface from "./types/ResolverContextInterface";

export default function contextMiddleware(request: RequestInterface): ResolverContextInterface {
    const authorizationHeader = request.headers.authorization ?? '';
    const authorizationToken = authorizationHeader
        .startsWith('Bearer ') ? authorizationHeader.slice(7) : null;

    return { authorizationToken };
}
