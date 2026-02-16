import { ConfigurationDocumentInterface } from '../document/types/ConfigurationDocumentInterface';
import { faker } from '@faker-js/faker';
import { ValueGeneratorType } from './types/ValueGeneratorType';
import { KeyPatternsInterface } from './types/KeyPatternsInterface';

const configKeys = [
    'theme',
    'language',
    'timezone',
    'dateFormat',
    'fontSize',
    'notifications',
    'sidebar.position',
    'sidebar.collapsed',
    'dashboard.layout',
    'dashboard.refreshRate',
    'editor.tabSize',
    'editor.wordWrap',
    'privacy.shareData',
    'privacy.cookies',
    'accessibility',
    'appearance.density',
    'appearance.animations',
    'currency',
    'itemsPerPage',
    'autoSave',
    'shortcuts',
    'colorScheme',
    'sound.enabled',
    'sound.volume',
    'notifications.email',
    'notifications.push',
    'notifications.desktop',
];

function generateThemeValue(): string {
    return faker.helpers.arrayElement(['light', 'dark', 'auto', 'high-contrast', 'custom']);
}

function generateLanguageValue(): string {
    return faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ru']);
}

function generateTimezoneValue(): string {
    return faker.location.timeZone();
}

function generateCurrencyValue(): string {
    return faker.finance.currencyCode();
}

function generateBooleanValue(): boolean {
    return faker.datatype.boolean();
}

function generateNumericValue(): number {
    return faker.number.int({ min: 1, max: 100 });
}

function generatePositionValue(): string {
    return faker.helpers.arrayElement(['left', 'right', 'top', 'bottom', 'compact', 'comfortable', 'spacious']);
}

function generateDateFormatValue(): string {
    return faker.helpers.arrayElement(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD.MM.YYYY']);
}

function generateComplexObjectValue(): object {
    return {
        enabled: faker.datatype.boolean(),
        [faker.helpers.arrayElement(['email', 'push', 'sms', 'desktop'])]: faker.datatype.boolean(),
        [faker.helpers.arrayElement(['frequency', 'priority', 'sound'])]: faker.helpers.arrayElement(['always', 'never', 'important']),
    };
}

function generateLayoutValue(): object {
    return {
        columns: faker.number.int({ min: 1, max: 4 }),
        widgets: faker.helpers.arrayElements(['calendar', 'tasks', 'notifications', 'weather', 'news', 'stats'], { min: 1, max: 4 }),
    };
}

function generateDefaultValue(): string | number {
    return faker.helpers.arrayElement([
        faker.word.adjective(),
        faker.color.human(),
        faker.number.int({ min: 1, max: 100 }).toString(),
    ]);
}

const valueGenerators: KeyPatternsInterface[] = [
    { patterns: ['theme', 'colorScheme'], generator: generateThemeValue },
    { patterns: ['language'], generator: generateLanguageValue },
    { patterns: ['timezone'], generator: generateTimezoneValue },
    { patterns: ['currency'], generator: generateCurrencyValue },
    { patterns: ['email', 'push', 'desktop', 'enabled', 'collapsed', 'wordWrap', 'autoSave', 'shareData', 'cookies', 'animations'], generator: generateBooleanValue },
    { patterns: ['Size', 'Rate', 'PerPage', 'volume'], generator: generateNumericValue },
    { patterns: ['position', 'density'], generator: generatePositionValue },
    { patterns: ['Format'], generator: generateDateFormatValue },
];

function matchesAnyPattern(key: string, patterns: string[]): boolean {
    return patterns.some(pattern => key.includes(pattern));
}

function getGeneratorForKey(key: string): ValueGeneratorType {
    if (key === 'notifications' || key === 'accessibility' || key === 'shortcuts') {
        return generateComplexObjectValue;
    }

    if (key.includes('layout')) {
        return generateLayoutValue;
    }

    const matchingGenerator = valueGenerators.find(({ patterns }) =>
        matchesAnyPattern(key, patterns)
    );

    return matchingGenerator ? matchingGenerator.generator : generateDefaultValue;
}

function generateRandomValue(key: string): unknown {
    const generator = getGeneratorForKey(key);
    return generator();
}

/**
 * Generate random configuration records ensuring unique (key, userId) combinations
 */
function generateRandomConfigs(count: number, existingConfigs: Partial<ConfigurationDocumentInterface>[]): Partial<ConfigurationDocumentInterface>[] {
    const configs: Partial<ConfigurationDocumentInterface>[] = [];
    const userIds = Array.from({ length: 200 }, () => `user_${faker.string.alphanumeric(8)}`);
    const usedCombinations = new Set<string>();

    // Helper to create a unique key for tracking
    function getCombinationKey(key: string, userId: string | undefined): string {
        return `${key}::${userId || '__null__'}`;
    }

    // Pre-populate with existing combinations from deterministic configs
    existingConfigs.forEach(config => {
        if (config.key) {
            usedCombinations.add(getCombinationKey(config.key, config.userId));
        }
    });

    let attempts = 0;
    const maxAttempts = count * 10; // Prevent infinite loop

    while (configs.length < count && attempts < maxAttempts) {
        attempts++;

        const key = faker.helpers.arrayElement(configKeys);
        const userId = faker.helpers.maybe(() => faker.helpers.arrayElement(userIds), { probability: 0.8 });
        const combinationKey = getCombinationKey(key, userId);

        // Skip if this combination already exists
        if (usedCombinations.has(combinationKey)) {
            continue;
        }

        usedCombinations.add(combinationKey);
        configs.push({
            key,
            userId,
            value: generateRandomValue(key),
        });
    }

    return configs;
}

/**
 * Sample configuration data for seeding the database
 */
const deterministicConfigs: Partial<ConfigurationDocumentInterface>[] = [
    // User-specific configurations (user: alice)
    {
        key: 'theme',
        userId: 'alice',
        value: 'dark',
    },
    {
        key: 'language',
        userId: 'alice',
        value: 'en',
    },
    {
        key: 'notifications',
        userId: 'alice',
        value: {
            email: true,
            push: false,
            sms: false,
        },
    },
    {
        key: 'dashboard.layout',
        userId: 'alice',
        value: {
            widgets: ['calendar', 'tasks', 'notifications'],
            columns: 3,
        },
    },

    // User-specific configurations (user: bob)
    {
        key: 'theme',
        userId: 'bob',
        value: 'light',
    },
    {
        key: 'language',
        userId: 'bob',
        value: 'es',
    },
    {
        key: 'notifications',
        userId: 'bob',
        value: {
            email: true,
            push: true,
            sms: true,
        },
    },
    {
        key: 'sidebar.collapsed',
        userId: 'bob',
        value: true,
    },

    // User-specific configurations (user: charlie)
    {
        key: 'theme',
        userId: 'charlie',
        value: 'auto',
    },
    {
        key: 'language',
        userId: 'charlie',
        value: 'fr',
    },
    {
        key: 'accessibility',
        userId: 'charlie',
        value: {
            highContrast: true,
            fontSize: 'large',
            screenReader: true,
        },
    },

    // Default/fallback configurations (no userId)
    {
        key: 'theme',
        value: 'light',
    },
    {
        key: 'language',
        value: 'en',
    },
    {
        key: 'notifications',
        value: {
            email: true,
            push: false,
            sms: false,
        },
    },
    {
        key: 'timezone',
        value: 'UTC',
    },
    {
        key: 'dateFormat',
        value: 'YYYY-MM-DD',
    },
    {
        key: 'itemsPerPage',
        value: 25,
    },
];

// Generate 1000 random configuration records (pass deterministic configs to avoid duplicates)
const randomConfigs = generateRandomConfigs(1000, deterministicConfigs);

// Export combined data: deterministic configs + random configs
export const configurationsData: Partial<ConfigurationDocumentInterface>[] = [
    ...deterministicConfigs,
    ...randomConfigs,
];
