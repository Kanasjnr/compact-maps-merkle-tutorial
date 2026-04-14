import { createHash } from "crypto";
import { Digest, MerkleTreePath, MerkleTreePathEntry } from "./types.js";

export class MerkleTree {
  private readonly leaves: Digest[] = [];
  private _root: Digest | null = null;

  constructor(
    public readonly depth: number,
    private readonly zeroValue: Digest = new Uint8Array(32).fill(0),
  ) {}

  private static hash(left: Digest, right: Digest): Digest {
    return createHash("sha256").update(left).update(right).digest();
  }

  public insert(leaf: Digest): void {
    if (this.leaves.length >= Math.pow(2, this.depth)) {
      throw new Error("Merkle Tree capacity exceeded");
    }
    this.leaves.push(leaf);
    this._root = null;
  }

  public get root(): Digest {
    if (this._root) return this._root;
    this._root = this.computeRoot(this.leaves, 0);
    return this._root;
  }

  public generateProof(index: number): MerkleTreePath {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Index ${index} out of bounds`);
    }

    const path: MerkleTreePathEntry[] = [];
    let currentIndex = index;
    let currentLevelNodes = this.leaves;

    for (let level = 0; level < this.depth; level++) {
      const isLeft = currentIndex % 2 === 0;
      const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;

      const sibling =
        siblingIndex < currentLevelNodes.length
          ? currentLevelNodes[siblingIndex]
          : this.getZeroValue(level);

      path.push({
        sibling: { bytes: sibling },
        goes_left: !isLeft,
      });

      const nextLevel: Digest[] = [];
      for (let i = 0; i < currentLevelNodes.length; i += 2) {
        nextLevel.push(
          MerkleTree.hash(
            currentLevelNodes[i],
            currentLevelNodes[i + 1] ?? this.getZeroValue(level),
          ),
        );
      }
      currentLevelNodes = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      leaf: this.leaves[index],
      path: Object.freeze(path),
    };
  }

  public getPathByLeaf(leaf: Digest): MerkleTreePath {
    const index = this.leaves.findIndex((l) => Buffer.compare(l, leaf) === 0);
    if (index === -1) {
      throw new Error(
        `Leaf 0x${Buffer.from(leaf).toString("hex").slice(0, 8)} not found in tree`,
      );
    }
    return this.generateProof(index);
  }

  private computeRoot(nodes: Digest[], level: number): Digest {
    if (level === this.depth) {
      return nodes.length > 0 ? nodes[0] : this.getZeroValue(level);
    }

    const nextLevel: Digest[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      nextLevel.push(
        MerkleTree.hash(nodes[i], nodes[i + 1] ?? this.getZeroValue(level)),
      );
    }

    return this.computeRoot(nextLevel, level + 1);
  }

  private getZeroValue(level: number): Digest {
    let val = this.zeroValue;
    for (let i = 0; i < level; i++) {
      val = MerkleTree.hash(val, val);
    }
    return val;
  }
}
