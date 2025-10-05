# Example Graph Queries

This document demonstrates common graph query patterns using the API.

## Basic Queries

### Get All People

```bash
curl "http://localhost:8787/things?type=Person"
```

**Response:**
```json
{
  "things": [
    {
      "id": "https://schema.org/Person/john-doe",
      "type": "Person",
      "properties": "{\"name\":\"John Doe\",...}",
      "source": "apps",
      "namespace": "default"
    }
  ],
  "total": 3
}
```

### Get Single Person

```bash
curl "http://localhost:8787/things/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"
```

### Search by Name

```bash
curl "http://localhost:8787/things/search?q=John"
```

## Relationship Queries

### Get All Relationships for a Person

```bash
curl "http://localhost:8787/relationships/outgoing/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"
```

**Response:**
```json
{
  "relationships": [
    {
      "id": 1,
      "subject": "https://schema.org/Person/john-doe",
      "predicate": "https://schema.org/worksFor",
      "object": "https://schema.org/Organization/acme-corp",
      "properties": "{\"since\":\"2020-06-01\"}",
      "objectType": "Organization",
      "objectProperties": "{\"name\":\"ACME Corporation\",...}"
    }
  ],
  "total": 3
}
```

### Find Who Works at ACME Corp

```bash
curl "http://localhost:8787/relationships/incoming/https%3A%2F%2Fschema.org%2FOrganization%2Facme-corp?predicate=https%3A%2F%2Fschema.org%2FworksFor"
```

## Graph Traversal

### 1-Hop: Find John's Direct Connections

```bash
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=1&direction=both"
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "https://schema.org/Person/john-doe",
      "type": "Person",
      "properties": {...}
    },
    {
      "id": "https://schema.org/Organization/acme-corp",
      "type": "Organization",
      "properties": {...}
    },
    {
      "id": "https://schema.org/Person/jane-smith",
      "type": "Person",
      "properties": {...}
    },
    {
      "id": "https://schema.org/Product/task-manager",
      "type": "Product",
      "properties": {...}
    }
  ],
  "edges": [
    {
      "subject": "https://schema.org/Person/john-doe",
      "predicate": "https://schema.org/worksFor",
      "object": "https://schema.org/Organization/acme-corp",
      "properties": {...}
    },
    ...
  ],
  "stats": {
    "nodeCount": 4,
    "edgeCount": 3
  }
}
```

### 2-Hop: Find Extended Network

```bash
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=2&direction=both&limit=50"
```

This will return all entities within 2 hops:
- John → ACME Corp → Other Employees
- John → Jane → Her Connections
- John → Task Manager → Offers

### Only Follow "worksFor" Relationships

```bash
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=2&predicateFilter=https%3A%2F%2Fschema.org%2FworksFor"
```

### Only Find Organizations

```bash
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=3&typeFilter=Organization"
```

## Path Finding

### Shortest Path from John to Task Manager

```bash
curl "http://localhost:8787/query/shortest-path?from=https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe&to=https%3A%2F%2Fschema.org%2FProduct%2Ftask-manager&depth=5"
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "https://schema.org/Person/john-doe",
      "type": "Person",
      "properties": {...}
    },
    {
      "id": "https://schema.org/Product/task-manager",
      "type": "Product",
      "properties": {...}
    }
  ],
  "edges": [
    {
      "subject": "https://schema.org/Person/john-doe",
      "predicate": "https://schema.org/author",
      "object": "https://schema.org/Product/task-manager",
      "properties": {...}
    }
  ],
  "length": 1
}
```

### All Paths from John to Task Manager

```bash
curl "http://localhost:8787/query/all-paths?from=https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe&to=https%3A%2F%2Fschema.org%2FProduct%2Ftask-manager&depth=3&limit=5"
```

This finds multiple paths:
1. John → (author) → Task Manager
2. John → (worksFor) → ACME Corp → (makesOffer) → Task Manager

## Subgraph Extraction

### Extract John's Local Network

```bash
curl "http://localhost:8787/query/subgraph/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?radius=1"
```

This returns all nodes within 1 hop and ALL edges between them (not just edges to John).

### Extract ACME Corp Ecosystem

```bash
curl "http://localhost:8787/query/subgraph/https%3A%2F%2Fschema.org%2FOrganization%2Facme-corp?radius=2"
```

This returns:
- ACME Corp
- All employees (1 hop)
- All products (1 hop)
- Products' offers (2 hops)
- All relationships between these entities

## Advanced Queries

### Find Common Connections

```bash
curl "http://localhost:8787/query/common-neighbors?id1=https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe&id2=https%3A%2F%2Fschema.org%2FPerson%2Fjane-smith"
```

**Response:**
```json
{
  "neighbors": [
    {
      "id": "https://schema.org/Organization/acme-corp",
      "type": "Organization",
      "properties": {...}
    },
    {
      "id": "https://schema.org/Person/bob-jones",
      "type": "Person",
      "properties": {...}
    }
  ],
  "total": 2
}
```

### Node Degree (Connection Count)

```bash
curl "http://localhost:8787/query/degree/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"
```

**Response:**
```json
{
  "in": 0,
  "out": 4,
  "total": 4
}
```

### Graph Statistics

```bash
curl "http://localhost:8787/query/stats?namespace=default"
```

**Response:**
```json
{
  "nodeCount": 7,
  "edgeCount": 12,
  "avgDegree": 3.43,
  "typeDistribution": {
    "Person": 3,
    "Organization": 1,
    "Product": 2,
    "Offer": 1
  },
  "predicateDistribution": {
    "https://schema.org/worksFor": 3,
    "https://schema.org/knows": 3,
    "https://schema.org/author": 1,
    "https://schema.org/contributor": 2,
    "https://schema.org/makesOffer": 2,
    "https://schema.org/offers": 1
  }
}
```

## Creating Data

### Create a New Person

```bash
curl -X POST "http://localhost:8787/things" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "https://schema.org/Person/alice-wilson",
    "type": "Person",
    "properties": {
      "name": "Alice Wilson",
      "email": "alice@example.com",
      "jobTitle": "Data Scientist"
    },
    "source": "apps",
    "namespace": "default"
  }'
```

### Create a Relationship

```bash
curl -X POST "http://localhost:8787/relationships" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "https://schema.org/Person/alice-wilson",
    "predicate": "https://schema.org/worksFor",
    "object": "https://schema.org/Organization/acme-corp",
    "properties": {
      "since": "2023-01-01",
      "department": "Data Science"
    },
    "namespace": "default"
  }'
```

## Use Case Examples

### 1. Organization Chart

Find all employees and their reporting structure:

```bash
# Get all employees
curl "http://localhost:8787/relationships/incoming/https%3A%2F%2Fschema.org%2FOrganization%2Facme-corp?predicate=https%3A%2F%2Fschema.org%2FworksFor"

# Get department structure (if you have department relationships)
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FOrganization%2Facme-corp?depth=2&predicateFilter=https%3A%2F%2Fschema.org%2Fdepartment"
```

### 2. Product Catalog

Find all products and their relationships:

```bash
# Get all products
curl "http://localhost:8787/things?type=Product"

# Get product details with offers
curl "http://localhost:8787/query/subgraph/https%3A%2F%2Fschema.org%2FProduct%2Ftask-manager?radius=1"
```

### 3. Social Network

Find connections between people:

```bash
# Get John's network (2 degrees of separation)
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe?depth=2&typeFilter=Person"

# Find mutual connections
curl "http://localhost:8787/query/common-neighbors?id1=https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe&id2=https%3A%2F%2Fschema.org%2FPerson%2Falice-wilson"
```

### 4. Recommendation Engine

Find similar products based on graph proximity:

```bash
# Get products in the same category (connected through organization)
curl "http://localhost:8787/query/traverse/https%3A%2F%2Fschema.org%2FProduct%2Ftask-manager?depth=2&typeFilter=Product"
```

### 5. Impact Analysis

Find what would be affected by deleting an entity:

```bash
# Get all incoming relationships
curl "http://localhost:8787/relationships/incoming/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"

# Get all outgoing relationships
curl "http://localhost:8787/relationships/outgoing/https%3A%2F%2Fschema.org%2FPerson%2Fjohn-doe"
```

## Performance Tips

1. **Limit Depth**: Keep traversal depth to 2-3 hops max
2. **Use Filters**: Apply type and predicate filters to reduce result set
3. **Pagination**: Use limit and offset for large result sets
4. **Direction**: Use `direction=outgoing` or `direction=incoming` instead of `both` when possible
5. **Caching**: Cache frequently accessed subgraphs at the application level
