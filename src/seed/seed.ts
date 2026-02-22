import seedConfigurations from "./seeders/configurationsSeeder";
import seedTokens from "./seeders/tokensSeeder";

export default async function seed(): Promise<void> {
    await seedTokens();
    await seedConfigurations();
}