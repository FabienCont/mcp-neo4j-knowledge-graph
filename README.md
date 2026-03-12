# MCP Neo4j Knowledge Graph Server

An MCP (Model Context Protocol) server that lets an LLM client (e.g. VS Code Copilot) build and query a Neo4j-backed knowledge graph.

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/FabienCont/mcp-neo4j-knowledge-graph.git
cd mcp-neo4j-knowledge-graph
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your credentials (must match `docker-compose.yml`):

| Variable             | Default                   | Description                             |
|----------------------|---------------------------|-----------------------------------------|
| `NEO4J_URI`          | `bolt://localhost:7687`   | Neo4j Bolt connection URI               |
| `NEO4J_USER`         | `neo4j`                   | Neo4j username                          |
| `NEO4J_PASSWORD`     | `password`                | Neo4j password                          |
| `ENABLE_RUN_CYPHER`  | `false`                   | Set to `true` to enable `runCypher` tool |

### 3. Start Neo4j

```bash
docker compose up -d
```

Neo4j Browser is available at http://localhost:7474.

### 4. Run the MCP server

```bash
# Development (runs TypeScript directly)
npm run dev

# Production (compile first, then run)
npm run build
npm start
```

## Available MCP Tools

### `health`

Check Neo4j connectivity.

- **Input:** none
- **Output:** `{ "ok": true }` if Neo4j is reachable

### `upsertEntity`

Create or update a node in the knowledge graph.

- **Input:**
  ```json
  {
    "label": "Person",
    "id": "fabien",
    "properties": { "name": "Fabien", "email": "fabien@example.com" }
  }
  ```
- **Behavior:** `MERGE (n:Person { id: $id }) SET n += $properties RETURN n`

### `upsertRelation`

Create or update a relationship between two nodes.

- **Input:**
  ```json
  {
    "from": { "label": "Person", "id": "fabien" },
    "to": { "label": "Repo", "id": "mcp-neo4j-knowledge-graph" },
    "type": "OWNS",
    "properties": { "since": "2026-03-11" }
  }
  ```
- **Behavior:** Merges both endpoint nodes and the relationship; sets properties.

### `runCypher` _(disabled by default)_

Run an arbitrary Cypher query.

- **Input:**
  ```json
  { "cypher": "MATCH (n) RETURN n LIMIT 5", "params": {} }
  ```
- **Behavior:** Requires `ENABLE_RUN_CYPHER=true` in `.env`; otherwise throws an error.

## VS Code Integration

Add the server to your VS Code MCP configuration (`.vscode/mcp.json` or user settings):

```json
{
  "servers": {
    "neo4j-knowledge-graph": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password"
      }
    }
  }
}
```

Or for development (no build step required):

```json
{
  "servers": {
    "neo4j-knowledge-graph": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "${workspaceFolder}/src/index.ts"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "password"
      }
    }
  }
}
```

## Security Notes

- `runCypher` is **disabled by default** and must be explicitly enabled via `ENABLE_RUN_CYPHER=true`.
- Label and relationship type names are validated against `^[A-Za-z_][A-Za-z0-9_]*$` to prevent injection.
- User-provided values (ids, properties) are always passed as Cypher parameters, never interpolated.

## Development

```bash
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # TypeScript compile to dist/
```
