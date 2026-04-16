# Maps & Merkle Trees

Technical demonstration of managing state in [Compact](https://docs.midnight.network/compact) smart contracts for the [Midnight](https://midnight.network) blockchain.

## Implementations

### Public Registry
An on-chain registry where state is transparent.
- **Structure**: `Map<Bytes<32>, Bytes<32>>`
- **Behavior**: Users register a profile hash against their public key.
- **Privacy**: Fully public on the ledger.

### Anonymous Allowlist
An access-control system using Zero-Knowledge proofs.
- **Structure**: `MerkleTree<20, Bytes<32>>`
- **Behavior**: Users prove membership anonymously via a Merkle path.
- **Privacy**: Identity is not disclosed on-chain.

## Project Structure

| Path | Purpose |
| :--- | :--- |
| `contract/` | Compact source code. |
| `src/index.ts` | Orchestrator logic. |
| `src/prover/` | Witness implementations. |
| `src/lib/` | Shared utilities. |
| `src/managed/` | SDK artifacts and ZKIR. |

## Technical Note: Merkle State Alignment

To avoid structural validation failures in the `compact-runtime`, the witness retrieves the membership path directly from the ledger context:

```typescript
// src/prover/allowlist_witnesses.ts
const path = context.ledger.allowlist.findPathForLeaf(leaf);
```

The runtime requires an instance of the `MerkleTreePath` class; a plain object with identical fields will be rejected. The `update_allowlist` circuit must be called to synchronize the on-chain root before proof generation.

## Execution

### Prerequisites
- Node.js v20+

### Setup
```bash
npm install
```

### Run
```bash
npx tsc
node dist/index.js
```

### Output
```text
Public Registry
└─ Circuit Execution: Proof Generated.

Anonymous Allowlist
└─ Root Hash: [updated]
└─ ACCESS GRANTED: Proof was valid.
└─ EXPECTED FAILURE: Bob is not on the list.
```
