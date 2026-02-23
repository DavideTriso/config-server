import { faker } from '@faker-js/faker';
import UpsertConfigurationInputInterface from "../../model/types/UpsertConfigurationInputInterface";
import ConfigurationModel from '../../model/ConfigurationModel';

const userIdsArray = Array.from({ length: 1000 }, () => faker.string.uuid());

function generateRandomValue(): string | boolean | number | string[] {
    const valueType = faker.helpers.arrayElement([1, 2, 3, 4]);
    switch (valueType) {
        case 1:
            return faker.string.alpha({ length: { min: 1, max: 20 } });
        case 2:
            return faker.datatype.boolean();
        case 3:
            return faker.number.int({ min: 1, max: 1000 });
        case 4:
            return Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => faker.string.alpha({ length: { min: 1, max: 20 } }));
    }
}

function generateRandomValueObj(nestingLevel: number = 0): Record<string, string | boolean | number | string[] | object> {
    const propsCount = faker.number.int({ min: 1, max: 25 });
    const keysArray = Array.from({ length: propsCount }, () => faker.string.alpha({ length: { min: 5, max: 20 } }));

    const obj: Record<string, string | boolean | number | string[] | object> = {};
    keysArray.forEach(key => {
        if (nestingLevel < 2 && faker.datatype.boolean(0.25)) {
            obj[key] = generateRandomValueObj(nestingLevel + 1);
        } else {
            obj[key] = generateRandomValue();
        }
    });
    return obj;
}

function generateUpsertConfigurationInput(userId: string, key: string): UpsertConfigurationInputInterface {
    return {
        key: key,
        userId: userId,
        value: generateRandomValueObj(),
    }
}
function generateUpsertConfigurationInputs(): UpsertConfigurationInputInterface[] {
    return [
        ...userIdsArray.map(userId => generateUpsertConfigurationInput(userId, 'key1')),
        ...userIdsArray.map(userId => generateUpsertConfigurationInput(userId, 'key2')),
        ...userIdsArray.map(userId => generateUpsertConfigurationInput(userId, 'key3')),
        ...userIdsArray.map(userId => generateUpsertConfigurationInput(userId, 'key4')),
        ...userIdsArray.map(userId => generateUpsertConfigurationInput(userId, 'key5')),
    ];
}

export default async function seedConfigurations(): Promise<void> {
    await ConfigurationModel.deleteAll(true);

    const upsertConfigurationInputs = generateUpsertConfigurationInputs();

    await Promise.all(
        upsertConfigurationInputs.map(async (upsertConfigurationInput) => {
            await ConfigurationModel.upsert(upsertConfigurationInput, false);
        })
    );
}