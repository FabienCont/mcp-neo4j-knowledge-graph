import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { verifyConnectivity, runQuery } from "./neo4j.js";

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function validateIdentifier(value: string, kind: string): void {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(
      `Invalid ${kind} "${value}": must match ^[A-Za-z_][A-Za-z0-9_]*$`
    );
  }
}

export function registerTools(server: McpServer): void {
  // health
  server.tool("health", "Check Neo4j connectivity", {}, async () => {
    await verifyConnectivity();
    return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
  });

  // upsertEntity
  server.tool(
    "upsertEntity",
    "Create or update a node in the knowledge graph",
    {
      label: z.string().describe("Node label (e.g. Person, Repo)"),
      id: z.string().describe("Unique identifier for the node"),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Additional properties to set on the node"),
    },
    async ({ label, id, properties = {} }) => {
      validateIdentifier(label, "label");
      const cypher = `MERGE (n:${label} { id: $id }) SET n += $properties RETURN n`;
      const result = await runQuery(cypher, { id, properties });
      const node = result.records[0]?.get("n");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(node ? node.properties : { id }),
          },
        ],
      };
    }
  );

  // upsertRelation
  server.tool(
    "upsertRelation",
    "Create or update a relationship between two nodes",
    {
      from: z
        .object({
          label: z.string().describe("Label of the source node"),
          id: z.string().describe("ID of the source node"),
        })
        .describe("Source node"),
      to: z
        .object({
          label: z.string().describe("Label of the target node"),
          id: z.string().describe("ID of the target node"),
        })
        .describe("Target node"),
      type: z.string().describe("Relationship type (e.g. OWNS, KNOWS)"),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Properties to set on the relationship"),
    },
    async ({ from, to, type, properties = {} }) => {
      validateIdentifier(from.label, "label");
      validateIdentifier(to.label, "label");
      validateIdentifier(type, "relationship type");
      const cypher = [
        `MERGE (a:${from.label} { id: $fromId })`,
        `MERGE (b:${to.label} { id: $toId })`,
        `MERGE (a)-[r:${type}]->(b)`,
        `SET r += $properties`,
        `RETURN a, r, b`,
      ].join(" ");
      const result = await runQuery(cypher, {
        fromId: from.id,
        toId: to.id,
        properties,
      });
      const record = result.records[0];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              record
                ? {
                    from: record.get("a").properties,
                    relationship: record.get("r").properties,
                    to: record.get("b").properties,
                  }
                : {}
            ),
          },
        ],
      };
    }
  );

  // runCypher (disabled by default)
  server.tool(
    "runCypher",
    "Run an arbitrary Cypher query (requires ENABLE_RUN_CYPHER=true)",
    {
      cypher: z.string().describe("Cypher query to execute"),
      params: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Query parameters"),
    },
    async ({ cypher, params = {} }) => {
      if (process.env.ENABLE_RUN_CYPHER !== "true") {
        throw new Error(
          "runCypher is disabled. Set ENABLE_RUN_CYPHER=true to enable it."
        );
      }
      const result = await runQuery(cypher, params as Record<string, unknown>);
      const records = result.records.map((r) => r.toObject());
      return {
        content: [{ type: "text", text: JSON.stringify(records) }],
      };
    }
  );
}
