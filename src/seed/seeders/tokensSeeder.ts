import TokenModel from '../../model/TokenModel';
import CreateTokenInputInterface from '../../model/types/CreateTokenInputInterface';

const createTokenInputs: CreateTokenInputInterface[] = [
    { name: 'Token1' },
    { name: 'Token2' }
];

export default async function seedTokens(): Promise<void> {
    await TokenModel.deleteAll(true);

    await Promise.all(
        createTokenInputs.map(async (createTokenInput) => {
            const createResult = await TokenModel.create(createTokenInput);
            console.log(`${createResult.token.name}: ${createResult.authorizationToken}\n`);
        })
    );
}