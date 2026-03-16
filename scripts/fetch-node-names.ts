import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const instanceUrl = process.argv[2];
if (!instanceUrl) {
  console.error('Usage: bun scripts/fetch-node-names.ts <n8n-instance-url>');
  console.error('Example: bun scripts/fetch-node-names.ts https://my-n8n.example.com');
  process.exit(1);
}

const baseUrl = instanceUrl.replace(/\/+$/, '');

interface NodeTypeDescriptor {
  name: string;
  defaults?: { name?: string };
}

async function fetchNodeNames(): Promise<void> {
  const url = `${baseUrl}/types/nodes.json`;
  console.log(`Fetching node types from ${url}...`);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const descriptors = (await response.json()) as NodeTypeDescriptor[];
  const nameMap: Record<string, string> = {};

  for (const desc of descriptors) {
    if (desc.name && desc.defaults?.name) {
      nameMap[desc.name] = desc.defaults.name;
    }
  }

  const outputPath = join(import.meta.dir, '..', 'data', 'node-names.json');
  writeFileSync(outputPath, JSON.stringify(nameMap, null, 2));
  console.log(`Saved ${Object.keys(nameMap).length} node names to data/node-names.json`);
}

fetchNodeNames();
