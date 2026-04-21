import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const fileBackedRouteMappedJsonPaths = [
  '/index-catalog.json',
  '/sites.json',
  '/activity-metrics.json',
  '/design.json',
  '/live-broadcast.json',
  '/legal-documents.json',
  '/server/index.json',
  '/desktop/index.json',
  '/steam/index.json',
] as const;

export const generatedRouteMappedJsonPaths = ['/about.json'] as const;

export const routeMappedJsonPaths = [
  ...fileBackedRouteMappedJsonPaths,
  ...generatedRouteMappedJsonPaths,
] as const;

export type FileBackedRouteMappedJsonPath = (typeof fileBackedRouteMappedJsonPaths)[number];
export type GeneratedRouteMappedJsonPath = (typeof generatedRouteMappedJsonPaths)[number];
export type RouteMappedJsonPath = (typeof routeMappedJsonPaths)[number];

const routeMappedJsonPathSet = new Set<string>(routeMappedJsonPaths);
const fileBackedRouteMappedJsonPathSet = new Set<string>(fileBackedRouteMappedJsonPaths);
const generatedRouteMappedJsonPathSet = new Set<string>(generatedRouteMappedJsonPaths);

export function serializePublishedJson(value: unknown): string {
  return JSON.stringify(value);
}

export function createPublishedJsonResponse(value: unknown): Response {
  return new Response(serializePublishedJson(value), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function assertRouteMappedJsonPath(sitePath: string): asserts sitePath is RouteMappedJsonPath {
  if (!routeMappedJsonPathSet.has(sitePath)) {
    throw new Error(`Unsupported route-mapped JSON path: ${sitePath}`);
  }
}

function resolvePublishedRoot(): string {
  return path.resolve(process.cwd(), process.env.INDEX_BUILD_ROOT ?? 'dist');
}

function resolveRouteMappedPublishedPath(sitePath: RouteMappedJsonPath): string {
  return path.join(resolvePublishedRoot(), sitePath.replace(/^\//, ''));
}

export function resolveRouteMappedSourcePath(sitePath: string): string {
  assertRouteMappedJsonPath(sitePath);

  if (!fileBackedRouteMappedJsonPathSet.has(sitePath)) {
    throw new Error(
      `Generated route-mapped JSON path ${sitePath} does not have a source JSON file. Load it from a published build output instead.`,
    );
  }

  return path.join(process.cwd(), 'src', 'data', 'public', sitePath.replace(/^\//, ''));
}

export async function loadRouteMappedJson<T>(sitePath: string): Promise<T> {
  assertRouteMappedJsonPath(sitePath);
  const raw = await readFile(
    generatedRouteMappedJsonPathSet.has(sitePath)
      ? resolveRouteMappedPublishedPath(sitePath)
      : resolveRouteMappedSourcePath(sitePath),
    'utf8',
  );

  return JSON.parse(raw) as T;
}

export async function createRouteMappedJsonResponse(sitePath: FileBackedRouteMappedJsonPath): Promise<Response> {
  const payload = await loadRouteMappedJson(sitePath);

  return createPublishedJsonResponse(payload);
}
