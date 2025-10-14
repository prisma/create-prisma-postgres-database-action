const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const serviceToken = core.getInput('service_token');
    const projectId = core.getInput('project_id');
    const databaseName = core.getInput('database_name');
    const region = core.getInput('region');

    if (!serviceToken || !projectId) {
      throw new Error('service_token and project_id are required');
    }

    const context = github.context;
    let sanitizedDbName;

    if (databaseName) {
      sanitizedDbName = sanitizeDatabaseName(databaseName);
    } else {
      if (context.payload.pull_request) {
        const prNumber = context.payload.pull_request.number;
        const branchName = context.payload.pull_request.head.ref;
        sanitizedDbName = sanitizeDatabaseName(`pr-${prNumber}-${branchName}`);
      } else {
        sanitizedDbName = sanitizeDatabaseName(`test-${context.runNumber}`);
      }
    }

    core.info(`Using database name: ${sanitizedDbName}`);

    const existingDb = await checkDatabaseExists(serviceToken, projectId, sanitizedDbName);
    let connectionString;
    let databaseId;

    if (existingDb) {
      core.info(`Database ${sanitizedDbName} already exists with ID: ${existingDb.id}`);
      databaseId = existingDb.id;
      connectionString = await createConnectionString(serviceToken, databaseId);
    } else {
      core.info(`Creating new database: ${sanitizedDbName}`);
      const newDb = await createDatabase(serviceToken, projectId, sanitizedDbName, region);
      databaseId = newDb.id;
      connectionString = newDb.connectionString;
    }

    core.setOutput('database_id', databaseId);
    core.setOutput('database_name', sanitizedDbName);
    core.setOutput('database_url', connectionString);

    core.info('✅ Database provisioned successfully!');
    core.info(`Database name: ${sanitizedDbName}`);
    core.info(`Database ID: ${databaseId}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

function sanitizeDatabaseName(name) {
  return name
    .replace(/[\/\-]/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

async function checkDatabaseExists(serviceToken, projectId, dbName) {
  const response = await fetch(
    `https://api.prisma.io/v1/projects/${projectId}/databases`,
    {
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch databases: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.find(db => db.name === dbName);
}

async function createDatabase(serviceToken, projectId, dbName, region) {
  const response = await fetch(
    `https://api.prisma.io/v1/projects/${projectId}/databases`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'prisma-postgres-github-action'
      },
      body: JSON.stringify({
        name: dbName,
        region: region
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create database: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    id: data.data.id,
    connectionString: data.data.connectionString
  };
}

async function createConnectionString(serviceToken, databaseId) {
  const response = await fetch(
    `https://api.prisma.io/v1/databases/${databaseId}/connections`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'read_write_key'
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create connection string: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.data.connectionString;
}

run();