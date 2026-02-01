export default {
  '*.{ts,js,json,css}': ['biome check --write'],
  '*.ts': () => 'bun run typecheck',
};
