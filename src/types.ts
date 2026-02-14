export { ConfigurationInterface } from './types/ConfigurationInterface';
export { ConfigurationUpsertResultInterface } from './types/ConfigurationUpsertResultInterface';
export { TokenInterface } from './types/TokenInterface';
export { TokenCreateInputInterface } from './types/TokenCreateInputInterface';
export { AuthContextInterface } from './types/AuthContextInterface';
export { ResolverContextInterface } from './types/ResolverContextInterface';

// Legacy type aliases for backward compatibility during migration
export type Configuration = ConfigurationInterface;
export type ConfigurationUpsertResult = ConfigurationUpsertResultInterface;
export type Token = TokenInterface;
export type TokenCreateInput = TokenCreateInputInterface;
export type AuthContext = AuthContextInterface;
export type ResolverContext = ResolverContextInterface;
