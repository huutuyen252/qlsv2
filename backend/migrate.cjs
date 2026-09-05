require("dotenv").config();

const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { drizzle } = require("drizzle-orm/node-postgres");
const { Client } = require("pg");

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  await client.connect();

  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migration completed!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
})();
