import { MerkleTree } from "../lib/merkle_tree.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export class AllowlistProver {
  constructor(private readonly tree: MerkleTree) {}

  get_membership_path(
    context: WitnessContext<any, any>,
    leaf: Uint8Array,
  ): [any, any] {
    console.log(
      `[Witness] Computing path for leaf 0x${Buffer.from(leaf).toString("hex").slice(0, 8)}...`,
    );

    const path = this.tree.getPathByLeaf(leaf);

    return [
      context.privateState,
      {
        leaf: Uint8Array.from(leaf),
        path: path.path.map((p) => ({
          sibling: Uint8Array.from(p.sibling.bytes),
          goes_left: p.goes_left,
        })),
      },
    ];
  }
}
