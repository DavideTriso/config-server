import typeDefs from '../src/graphql/schema';

describe('GraphQL Schema', () => {
  test('should have valid schema definition', () => {
    expect(typeDefs).toBeDefined();
    expect(typeof typeDefs).toBe('object');
  });

  test('schema should contain Configuration type', () => {
    const schemaString = typeDefs.loc?.source.body || '';
    expect(schemaString).toMatch(/type Configuration/);
    expect(schemaString).toMatch(/key: String!/);
    expect(schemaString).toMatch(/userId: String!/);
    expect(schemaString).toMatch(/value: JSON!/);
  });

  test('schema should contain Query type with getConfiguration', () => {
    const schemaString = typeDefs.loc?.source.body || '';
    expect(schemaString).toMatch(/type Query/);
    expect(schemaString).toMatch(/getConfiguration\(key: String!\): Configuration/);
    expect(schemaString).toMatch(/getUserConfigurations: \[Configuration!\]!/);
  });

  test('schema should contain Mutation type with upsertConfiguration', () => {
    const schemaString = typeDefs.loc?.source.body || '';
    expect(schemaString).toMatch(/type Mutation/);
    expect(schemaString).toMatch(/upsertConfiguration\(key: String!, value: JSON!\): Configuration!/);
  });
});
