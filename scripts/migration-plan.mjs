export function isMigrationFile(filename) {
  return /^\d{4}_.*\.sql$/.test(filename);
}
