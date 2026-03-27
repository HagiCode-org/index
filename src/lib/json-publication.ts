import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const routeMappedJsonPaths = [
  '/index-catalog.json',
  '/activity-metrics.json',
  '/server/index.json',
  '/desktop/index.json',
] as const;

export type RouteMappedJsonPath = (typeof routeMappedJsonPaths)[number];

const routeMappedJsonPathSet = new Set<string>(routeMappedJsonPaths);

export function serializePublishedJson(value: unknown): string {
  return JSON.stringify(value);
}

export function resolveRouteMappedSourcePath(sitePath: string): string {
  if (!routeMappedJsonPathSet.has(sitePath)) {
    throw new Error(`Unsupported route-mapped JSON path: ${sitePath}`);
  }

  return path.join(process.cwd(), 'src', 'data', 'public', sitePath.replace(/^\//, ''));
}

export async function loadRouteMappedJson<T>(sitePath: string): Promise<T> {
  const raw = await readFile(resolveRouteMappedSourcePath(sitePath), 'utf8');
  return JSON.parse(raw) as T;
}

export async function createRouteMappedJsonResponse(sitePath: RouteMappedJsonPath): Promise<Response> {
  const payload = await loadRouteMappedJson(sitePath);

  return new Response(serializePublishedJson(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
