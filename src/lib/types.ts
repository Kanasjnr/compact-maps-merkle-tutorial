export type Digest = Uint8Array;

export interface MerkleTreeDigest {
  readonly bytes: Digest;
}

export interface MerkleTreePathEntry {
  readonly sibling: MerkleTreeDigest;
  readonly goes_left: boolean;
}

export interface MerkleTreePath<T = Digest> {
  readonly leaf: T;
  readonly path: readonly MerkleTreePathEntry[];
}

export interface ZswapPublicKey {
  readonly bytes: Digest;
}

/**
 * Represents the public state of our contracts on the ledger.
 */
export interface RegistryLedger {
  readonly registry: ReadonlyMap<string, Digest>;
}

export interface AllowlistLedger {
  readonly allowlistRoot: Digest;
}
