import neo4j, { Driver, QueryResult } from "neo4j-driver";

const NEO4J_URI = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const NEO4J_USER = process.env.NEO4J_USER ?? "neo4j";
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? "password";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    );
  }
  return driver;
}

export async function verifyConnectivity(): Promise<void> {
  await getDriver().verifyConnectivity();
}

export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {}
): Promise<QueryResult> {
  const session = getDriver().session();
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
