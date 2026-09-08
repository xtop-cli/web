// Shared helpers safe for client components (no node builtins).
export const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";
export const asset = (p: string) => `${ASSET_PREFIX}${p}`;
