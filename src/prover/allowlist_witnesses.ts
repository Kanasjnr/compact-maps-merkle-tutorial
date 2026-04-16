import { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../managed/allowlist/contract/index.js';

export class AllowlistProver {
    get_membership_path(
        context: WitnessContext<Ledger, any>,
        leaf: Uint8Array,
    ): [any, any] {
        console.log(
            `[Witness] Computing path for leaf 0x${Buffer.from(leaf).toString('hex').slice(0, 8)}...`,
        );

        const path = context.ledger.allowlist.findPathForLeaf(leaf);

        if (path === undefined) {
            throw new Error(`Leaf not found in Merkle tree`);
        }

        return [context.privateState, path];
    }
}
