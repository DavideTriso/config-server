import RequestInterface from "./types/RequestInterface";
import ResolverContextInterface from "./types/ResolverContextInterface";

export default function contextMiddleware(request: RequestInterface): ResolverContextInterface {
    const authorizationHeader = request.headers.authorization ?? '';
    const token = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;

    return { token };
}
