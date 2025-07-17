# Create Prisma Postgres Database Action

A GitHub Action to create Prisma Postgres databases in your CI/CD workflows.

## Usage

### Basic Usage

```yaml
- name: Create Database
  id: create
  uses: prisma/create-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}

- name: Use Database
  env:
    DATABASE_URL: ${{ steps.create.outputs.database_url }}
  run: |
    echo "Database ready: ${{ steps.create.outputs.database_name }}"
    # Use the DATABASE_URL in your application
```

### With Custom Database Name

```yaml
- name: Create Database
  uses: prisma/create-prisma-postgres-database-action@v1
  with:
    service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
    project_id: ${{ secrets.PRISMA_PROJECT_ID }}
    database_name: "my-test-db"
```

### Complete Example for Pull Requests

```yaml
name: PR Database Testing
on:
  pull_request:
    types: [opened, reopened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Database
        id: create
        uses: prisma/create-prisma-postgres-database-action@v1
        with:
          service_token: ${{ secrets.PRISMA_POSTGRES_SERVICE_TOKEN }}
          project_id: ${{ secrets.PRISMA_PROJECT_ID }}

      - name: Setup Database Schema
        env:
          DATABASE_URL: ${{ steps.create.outputs.database_url }}
        run: |
          npx prisma generate
          npx prisma db push

      - name: Run Tests
        env:
          DATABASE_URL: ${{ steps.create.outputs.database_url }}
        run: npm test
```

## Inputs

| Input           | Description                   | Required | Default        |
| --------------- | ----------------------------- | -------- | -------------- |
| `service_token` | Prisma Postgres service token | ✅       |                |
| `project_id`    | Prisma project ID             | ✅       |                |
| `database_name` | Database name                 | ❌       | Auto-generated |
| `region`        | Database region               | ❌       | `us-east-1`    |

## Outputs

| Output          | Description                             |
| --------------- | --------------------------------------- |
| `database_id`   | The ID of the created/existing database |
| `database_name` | The name of the database                |
| `database_url`  | The DATABASE_URL for the database       |

## Setup

### 1. Get Prisma Postgres Credentials

1. Sign up for [Prisma Postgres](https://www.prisma.io/postgres)
2. Generate a service token

### 2. Create a Dedicated Project for CI

To avoid conflicts with your development databases, create a dedicated project specifically for CI workflows. Use the following curl command to create a new Prisma Postgres project:

```bash
curl -X POST https://api.prisma.io/v1/projects \
  -H "Authorization: Bearer $PRISMA_POSTGRES_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"region\": \"us-east-1\", \"name\": \"$PROJECT_NAME\"}"
```

Note the project ID from the response.

### 3. Add Repository Secrets

Go to your repository settings → Secrets and variables → Actions, and add:

- `PRISMA_POSTGRES_SERVICE_TOKEN`: Your Prisma Postgres service token
- `PRISMA_PROJECT_ID`: Your Prisma project ID

### 4. Use in Your Workflow

Add the action to your workflow as shown in the examples above.

## Database Naming

**Auto-generated names:**

- PR context: `pr_{pr_number}_{branch_name}`
- Other contexts: `test_{run_number}`

## Using with Different Tools

This action only provisions the database and provides a connection string. You can use it with any database tool:

### With Prisma

```yaml
- name: Setup with Prisma
  env:
    DATABASE_URL: ${{ steps.provision.outputs.database_url }}
  run: |
    npx prisma generate
    npx prisma db push
```

## Related Actions

- [Delete Prisma Postgres Database Action](https://github.com/prisma/delete-prisma-postgres-database-action) - Delete Prisma Postgres database

## Support

For issues and questions:

- [GitHub Issues](https://github.com/prisma/create-prisma-postgres-database-action/issues)
- [Prisma Postgres Documentation](https://www.prisma.io/docs/postgres)

## License

Apache License - see [LICENSE](LICENSE) file for details.
