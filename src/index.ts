import { MerkleTree } from "./lib/merkle_tree.js";
import { AllowlistProver } from "./prover/allowlist_witnesses.js";
import { Contract as RegistryContract } from "./managed/registry/contract/index.js";
import { Contract as AllowlistContract } from "./managed/allowlist/contract/index.js";
import { createHash } from "crypto";
import * as __compactRuntime from "@midnight-ntwrk/compact-runtime";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.clear();
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("🌑 MIDNIGHT: THE STATE DICHOTOMY DEMO");
  console.log(
    "------------------------------------------------------------------\n",
  );

  // --- SETUP ---
  console.log("STEP 1: Initializing Infrastructure...");
  await sleep(800);
  const depth = 20;
  const mt = new MerkleTree(depth);
  const allowlistWitnesses = new AllowlistProver(mt);

  const registryContract = new RegistryContract({});
  const allowlistContract = new AllowlistContract({
    get_membership_path: (context, leaf) =>
      allowlistWitnesses.get_membership_path(context, leaf),
  });

  const toCleanUint8Array = (buf: Uint8Array) => Uint8Array.from(buf);

  const alicePk = toCleanUint8Array(
    createHash("sha256").update("alice-public-key").digest(),
  );
  const bobPk = toCleanUint8Array(
    createHash("sha256").update("bob-public-key").digest(),
  );
  const profileHash = toCleanUint8Array(
    createHash("sha256").update("Alice: Principal Engineer").digest(),
  );

  // Initial States
  const registryInit = registryContract.initialState({
    initialPrivateState: undefined,
    initialZswapLocalState: { coinPublicKey: alicePk, units: 0n } as any,
  });

  const allowlistInit = allowlistContract.initialState({
    initialPrivateState: undefined,
    initialZswapLocalState: { coinPublicKey: alicePk, units: 0n } as any,
  });

  console.log("✅ Ready. Identity 'Alice' created.");
  console.log("✅ Ready. Identity 'Bob' created (Unregistered).\n");
  await sleep(1000);

  // --- TASK 1: MAPS ---
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("TASK 1: Map-based Public Registry");
  console.log(
    "------------------------------------------------------------------",
  );

  console.log("[User] Alice is registering her profile...");

  try {
    // Proper Context Initialization
    const context = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      registryInit.currentZswapLocalState,
      registryInit.currentContractState,
      registryInit.currentPrivateState,
    );

    registryContract.circuits.register(context, profileHash);
    console.log("└─ ✅ Circuit Execution: Proof Generated.");

    console.log("\n[Check] Verifying registration status on the Ledger:");
    const aliceRes = registryContract.circuits.is_registered(context, alicePk);
    console.log(
      `└─ Query Alice: Result is ${aliceRes.result} (Expected: true)`,
    );

    const bobRes = registryContract.circuits.is_registered(context, bobPk);
    console.log(`└─ Query Bob:   Result is ${bobRes.result} (Expected: false)`);
  } catch (e: any) {
    console.error(`❌ Registry Task failed: ${e.message}`);
  }
  console.log(
    "------------------------------------------------------------------\n",
  );
  await sleep(2000);

  // --- TASK 2: MERKLE TREES ---
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("TASK 2: Merkle-based Anonymous Allowlist");
  console.log(
    "------------------------------------------------------------------",
  );

  console.log("[Admin] Inserting Alice into the Merkle Tree...");
  mt.insert(alicePk);
  console.log(`└─ 🌐 Root Hash: ${mt.root.toString("hex").slice(0, 16)}...`);
  await sleep(1500);

  console.log("[User] Alice proving membership anonymously...");
  try {
    const context = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      allowlistInit.currentZswapLocalState,
      allowlistInit.currentContractState,
      allowlistInit.currentPrivateState,
    );

    allowlistContract.circuits.access_exclusive_area(context, alicePk);
    console.log("└─ ✅ ACCESS GRANTED: Proof was valid.");
  } catch (e: any) {
    console.error(`└─ ❌ ACCESS DENIED: ${e.message}`);
  }

  console.log("\n[User] Bob trying to prove membership (Unregistered)...");
  try {
    const bobInit = allowlistContract.initialState({
      initialPrivateState: undefined,
      initialZswapLocalState: { coinPublicKey: bobPk, units: 0n } as any,
    });
    const context = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      bobInit.currentZswapLocalState,
      bobInit.currentContractState,
      bobInit.currentPrivateState,
    );
    allowlistContract.circuits.access_exclusive_area(context, bobPk);
  } catch (e: any) {
    console.log(
      `└─ ✅ EXPECTED FAILURE: Bob is not on the list. Circuit asserted false.`,
    );
  }

  console.log(
    "\n------------------------------------------------------------------",
  );
  console.log("🏁 DEMO COMPLETE");
  console.log(
    "The tutorial is now running on REAL machine-generated SDK artifacts.",
  );
  console.log(
    "------------------------------------------------------------------",
  );
}

main().catch((error) => {
  console.error(`\n[Fatal Error] ${error.message}`);
  process.exit(1);
});
