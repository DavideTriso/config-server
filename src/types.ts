export { ConfigurationInterface } from './document/types/ConfigurationInterface';
export { ConfigurationUpsertResultInterface } from './types/ConfigurationUpsertResultInterface';
export { TokenInterface } from './document/types/TokenInterface';
export { TokenCreateInputInterface } from './document/types/TokenCreateInputInterface';
export { AuthContextInterface } from './types/AuthContextInterface';
export { ResolverContextInterface } from './types/ResolverContextInterface';

// Import for local type aliases
import type { ConfigurationInterface } from './document/types/ConfigurationInterface';
import type { ConfigurationUpsertResultInterface } from './types/ConfigurationUpsertResultInterface';
import type { TokenInterface } from './document/types/TokenInterface';
import type { TokenCreateInputInterface } from './document/types/TokenCreateInputInterface';
import type { AuthContextInterface } from './types/AuthContextInterface';
import type { ResolverContextInterface } from './types/ResolverContextInterface';

// Legacy type aliases for backward compatibility during migration
export type Configuration = ConfigurationInterface;
export type ConfigurationUpsertResult = ConfigurationUpsertResultInterface;
export type Token = TokenInterface;
export type TokenCreateInput = TokenCreateInputInterface;
export type AuthContext = AuthContextInterface;
export type ResolverContext = ResolverContextInterface;
