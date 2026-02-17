import TokenModel from '../../model/TokenModel';
import CreateAdminTokenInputInterface from '../../model/types/CreateAdminTokenInputInterface';
import CreateTokenInputInterface from '../../model/types/CreateTokenInputInterface';

const createTokenInputs: CreateTokenInputInterface[] = [
    { name: 'Token 1' },
    { name: 'Token 2' }
];

const createAdminTokenInputs: CreateAdminTokenInputInterface[] = [
    { name: 'Admin Token 1' },
    { name: 'Admin Token 2' }
];

export default async function seedTokens(): Promise<void> {
    await TokenModel.deleteAll(false);

    await Promise.all(
        createTokenInputs.map(async (createTokenInput) => {
            await TokenModel.create(createTokenInput, false, 'seeder');
        })
    );

    await Promise.all(
        createAdminTokenInputs.map(async (createAdminTokenInput) => {
            await TokenModel.createAdmin(createAdminTokenInput, false, 'seeder');
        })
    );
}