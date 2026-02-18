import DatabaseConnection from "../database/DatabaseConnection";
import seedConfigurations from "./seeders/configurationsSeeder";
import seedTokens from "./seeders/tokensSeeder";

export default async function seed(): Promise<void> {
    const databaseConnection = new DatabaseConnection();
    await databaseConnection.connect();
    await seedTokens();
    await seedConfigurations();
}