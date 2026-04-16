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

  console.log("STEP 1: Initializing Infrastructure...");
  await sleep(800);

  const prover = new AllowlistProver();
  const registryContract = new RegistryContract({});
  const allowlistContract = new AllowlistContract({
    get_membership_path: (context, leaf) =>
      prover.get_membership_path(context as any, leaf),
  });

  // Ensure keys are backed by a plain ArrayBuffer (not a Node.js Buffer pool slice)
  const toPureU8 = (raw: Uint8Array | Buffer) => {
    const u8 = new Uint8Array(32);
    u8.set(raw);
    return u8;
  };

  const alicePk = toPureU8(
    createHash("sha256").update("alice-public-key").digest(),
  );
  const bobPk = toPureU8(
    createHash("sha256").update("bob-public-key").digest(),
  );
  const profileHash = toPureU8(
    createHash("sha256").update("Alice: Principal Engineer").digest(),
  );

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

  // ── TASK 1: MAPS ──────────────────────────────────────────────────────────
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("TASK 1: Map-based Public Registry");
  console.log(
    "------------------------------------------------------------------",
  );

  console.log("[User] Alice is registering her profile...");

  try {
    const initialContext = __compactRuntime.createCircuitContext(
      __compactRuntime.dummyContractAddress(),
      { bytes: alicePk },
      registryInit.currentContractState,
      registryInit.currentPrivateState,
    );

    const { context: updatedContext } = registryContract.circuits.register(
      initialContext,
      profileHash,
    );
    console.log("└─ ✅ Circuit Execution: Proof Generated.");

    console.log(
      "\n[Check] Verifying registration status on the Ledger (Live Context):",
    );
    const aliceRes = registryContract.circuits.is_registered(
      updatedContext,
      alicePk,
    );
    console.log(
      `└─ Query Alice: Result is ${aliceRes.result} (Expected: true)`,
    );

    const bobRes = registryContract.circuits.is_registered(
      updatedContext,
      bobPk,
    );
    console.log(`└─ Query Bob:   Result is ${bobRes.result} (Expected: false)`);
  } catch (e: any) {
    console.error(`❌ Registry Task failed: ${e.message}`);
  }

  console.log(
    "------------------------------------------------------------------\n",
  );
  await sleep(2000);

  // ── TASK 2: MERKLE TREES ──────────────────────────────────────────────────
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("TASK 2: Merkle-based Anonymous Allowlist");
  console.log(
    "------------------------------------------------------------------",
  );

  console.log("[Admin] Inserting Alice into the Merkle Tree...");
  const adminCtx = __compactRuntime.createCircuitContext(
    __compactRuntime.dummyContractAddress(),
    { bytes: alicePk },
    allowlistInit.currentContractState,
    allowlistInit.currentPrivateState,
  );
  const { context: updatedAllowlistCtx } =
    allowlistContract.circuits.update_allowlist(adminCtx, alicePk);

  // Best-effort root display — internals may vary across runtime versions
  const internal = updatedAllowlistCtx as any;
  let rootDisplay = "updated";
  try {
    const digest =
      internal?.ledger?.allowlist?.root?.() ??
      internal?.contractState?.allowlist?.root?.();
    if (digest?.field !== undefined) {
      rootDisplay = digest.field.toString(16).slice(0, 16);
    }
  } catch (_) {}
  console.log(`└─ 🌐 Root Hash: ${rootDisplay}...`);
  await sleep(1500);

  console.log("[User] Alice proving membership anonymously...");
  try {
    allowlistContract.circuits.access_exclusive_area(
      updatedAllowlistCtx,
      alicePk,
    );
    console.log("└─ ✅ ACCESS GRANTED: Proof was valid.");
  } catch (e: any) {
    console.error(`└─ ❌ ACCESS DENIED: ${e.message}`);
  }

  console.log("\n[User] Bob trying to prove membership (Unregistered)...");
  try {
    allowlistContract.circuits.access_exclusive_area(
      updatedAllowlistCtx,
      bobPk,
    );
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
    "------------------------------------------------------------------",
  );
}

main().catch((error) => {
  console.error(`\n[Fatal Error] ${error.message}`);
  process.exit(1);
});
