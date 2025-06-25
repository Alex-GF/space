import { seedDatabase } from "../../main/database/seeders/mongo/seeder.js";

async function resetDatabase(){
  switch (process.env.DATABASE_TECHNOLOGY) {
    case "mongoDB":
      await seedDatabase();
      break;
    default:
      throw new Error("Unsupported database technology");
  }
}

export { resetDatabase };