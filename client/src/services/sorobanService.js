import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  scValToNative,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { signTransaction } from "@stellar/freighter-api";

// Contract addresses - Update these with your deployed contract addresses
const CONTRACT_ADDRESS_TOKEN = "CDHRNIGP6FT4NVRRGIDSAAOKUQMQYAS7LX6BWLX65SEAWJAGTF6YVZ7N";// old one CDB5EWYMHLVBUCF34JKI6V53DLV6IKZPABNTPGXRR7L5XUVDBKE2ZSA3

const CONTRACT_ADDRESS_WAGE = "CDCLWMLTRGRKLVIGMZTBIRRXF2KEH5UAQBSMCL3RDGTSZRV7PDVY2O5C";//CAHEHF7DFQKQBBG6SRQF6U3P6WWDIIP6UAZXEPZAXMXYYYLIS7L7MJTN old contract address 

const RPC_URL = "https://soroban-testnet.stellar.org";

// Initialize Soroban RPC client
const server = new rpc.Server(RPC_URL);

// Helper functions for converting values to Soroban ScVal
export const addressToScVal = (account) => {
  return new Address(account).toScVal();
};

export const stringToScVal = (str) => {
  return nativeToScVal(str);
};

export const numberToU128 = (num) => {
  return nativeToScVal(num, { type: "u128" });
};

export const numberToI128 = (num) => {
  return nativeToScVal(num, { type: "i128" });
};

// Get transaction params
const getTransactionParams = (publicKey) => ({
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET,
});

// Build and prepare a contract call transaction
async function buildContractCall(publicKey, contractId, functionName, args = []) {
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(contractId);

    const operation = contract.call(functionName, ...args);

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    // Simulate the transaction to get the prepared transaction
    const preparedTx = await server.prepareTransaction(transaction);
    return preparedTx;
  } catch (error) {
    console.error(`Error building contract call for ${functionName}:`, error);
    throw error;
  }
}

// Sign transaction with Freighter
async function signWithFreighter(preparedTx) {
  const txXdr = preparedTx.toXDR();
  const signedResponse = await signTransaction(txXdr, {
    network: "TESTNET",
    networkPassphrase: Networks.TESTNET,
  });

  if (!signedResponse) {
    throw new Error("Transaction signature was rejected or failed.");
  }

  // The NPM package might return an object { signedTxXdr: "..." } or a raw string
  const finalXdr = typeof signedResponse === 'object' ? signedResponse.signedTxXdr || signedResponse.txXdr : signedResponse;

  if (!finalXdr || typeof finalXdr !== 'string') {
    throw new Error("Invalid response format from Freighter SDK: Missing XDR string.");
  }

  return TransactionBuilder.fromXDR(finalXdr, Networks.TESTNET);
}

// Submit signed transaction
async function submitTransaction(signedTx) {
  try {
    const response = await server.sendTransaction(signedTx);

    if (response.status === "ERROR") {
      throw new Error(`Transaction error: ${response.errorResultXdr}`);
    }

    if (response.status === "PENDING" || response.status === "SUCCESS") {
      const pollRpc = async () => {
        const res = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTransaction",
            params: { hash: response.hash }
          })
        });
        return (await res.json()).result;
      };

      let txResponse = await pollRpc();

      while (txResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        txResponse = await pollRpc();
      }

      if (txResponse.status === "SUCCESS") {
        return {
          success: true,
          hash: response.hash,
          // Bypass stellar-sdk generic fromXDR parsing on resultXdr to avoid crashes
          resultRaw: txResponse.resultXdr,
        };
      } else {
        throw new Error(`Transaction failed: ${txResponse.status}`);
      }
    }

    return { success: true, hash: response.hash };
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
}

// ============================================
// EARLY WAGE CONTRACT FUNCTIONS
// ============================================

/**
 * Register a new employee
 * @param {string} publicKey - The caller's public key
 * @param {string} walletAddress - Employee's wallet address
 * @param {number} salary - Monthly salary amount
 */
export async function registerEmployee(publicKey, walletAddress, salary) {
  const args = [addressToScVal(walletAddress), numberToU128(salary)];

  const preparedTx = await buildContractCall(
    publicKey,
    CONTRACT_ADDRESS_WAGE,
    "register_employee",
    args
  );

  const signedTx = await signWithFreighter(preparedTx);
  return submitTransaction(signedTx);
}

/**
 * Deposit funds to the vault
 * @param {string} publicKey - The depositor's public key
 * @param {number} amount - Amount to deposit
 * @param {string} tokenAddress - Token contract address (optional)
 */
export async function depositToVault(publicKey, amount, tokenAddress = CONTRACT_ADDRESS_TOKEN) {
  // Pre-flight check: Ensure the depositor has enough token balance
  const balance = await getTokenBalance(publicKey, tokenAddress);
  if (balance < amount) {
    throw new Error(`Insufficient token balance! You only have ${balance} tokens.`);
  }

  const args = [
    addressToScVal(publicKey),
    numberToI128(amount),
    addressToScVal(tokenAddress),
  ];

  const preparedTx = await buildContractCall(
    publicKey,
    CONTRACT_ADDRESS_WAGE,
    "deposit_to_vault",
    args
  );

  const signedTx = await signWithFreighter(preparedTx);
  return submitTransaction(signedTx);
}

/**
 * Request a salary advance
 * @param {string} publicKey - The caller's public key
 * @param {number} empId - Employee ID
 * @param {number} amount - Amount to request
 * @param {string} tokenAddress - Token contract address (optional)
 */
export async function requestAdvance(publicKey, empId, amount, tokenAddress = CONTRACT_ADDRESS_TOKEN) {
  // Pre-flight check: Ensure the contract vault has enough balance to pay out
  const vaultBalance = await getVaultBalance(publicKey, tokenAddress);
  const fee = amount * 0.0125;
  const netAmount = amount - fee;

  if (vaultBalance < netAmount) {
    throw new Error(`Contract has insufficient funds to pay this advance right now.`);
  }

  const args = [
    numberToU128(empId),
    numberToI128(amount),
    addressToScVal(tokenAddress),
  ];

  const preparedTx = await buildContractCall(
    publicKey,
    CONTRACT_ADDRESS_WAGE,
    "request_advance",
    args
  );

  const signedTx = await signWithFreighter(preparedTx);
  return submitTransaction(signedTx);
}

/**
 * Get vault balance
 * @param {string} publicKey - The caller's public key
 * @param {string} tokenAddress - Token contract address (optional)
 */
export async function getVaultBalance(publicKey, tokenAddress = CONTRACT_ADDRESS_TOKEN) {
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(CONTRACT_ADDRESS_WAGE);

    const operation = contract.call("vault_balance", addressToScVal(tokenAddress));

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(transaction);

    if (simResult.result) {
      const resultValue = xdr.ScVal.fromXDR(simResult.result.retval.toXDR());
      return Number(resultValue.i128().lo().toString());
    }
    return 0;
  } catch (error) {
    console.error("Error getting vault balance:", error);
    return 0;
  }
}

/**
 * Get internal token balance for a specific address
 * vulnerability fix: This function exists to pre-flight check a user's token balance 
 * before prompting Freighter, preventing expensive on-chain "insufficient balance" panics.
 * @param {string} address - The public key or contract address
 * @param {string} tokenAddress - Token contract address
 */
export async function getTokenBalance(address, tokenAddress = CONTRACT_ADDRESS_TOKEN) {
  try {
    const contract = new Contract(tokenAddress);

    // Call balance on the token contract
    const operation = contract.call("balance", addressToScVal(address));

    // To just simulate a read, any valid account can be used as the source
    // Here we use the actual user address if available
    const account = await server.getAccount(address).catch(() =>
      new window.StellarSdk.Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF", "0")
    );

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(transaction);
    if (simResult.result) {
      const resultValue = xdr.ScVal.fromXDR(simResult.result.retval.toXDR());
      return Number(resultValue.i128().lo().toString());
    }
    return 0;
  } catch (error) {
    console.error("Error getting token balance:", error);
    return 0;
  }
}

/**
 * Get employee details
 * @param {string} publicKey - The caller's public key
 * @param {number} empId - Employee ID
 */
export async function getEmployeeDetails(publicKey, empId) {
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(CONTRACT_ADDRESS_WAGE);

    const operation = contract.call("get_emp_details", numberToU128(empId));

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(transaction);

    if (simResult.result) {
      // Parse the struct result
      const resultValue = simResult.result.retval;
      // Note: You'll need to parse the struct based on its definition
      return resultValue;
    }
    return null;
  } catch (error) {
    console.error("Error getting employee details:", error);
    return null;
  }
}

/**
 * Get employee details with wallet address (alternative to empId)
 * @param {string} publicKey - The caller's public key
 */
export async function getEmployeeWithWA(publicKey) {


  try {
    // Data normalization - convert the struct to a more usable format
    const parseFields = (retval) => {
      // Safe extraction to prevent Array.prototype.map type errors
      let entries = [];
      const val = typeof retval.value === 'function' ? retval.value() : retval.value;
      if (Array.isArray(val)) {
        entries = val; // Native array of SCMapEntry
      } else if (val && typeof val.entries === 'function') {
        entries = val.entries(); // Interable map
      } else if (retval.map && typeof retval.map === 'function' && typeof retval.map().entries === 'function') {
        entries = retval.map().entries(); // Soroban early SDK fallback
      }

      const obj = { empId: null, wallet: "", rem_salary: null, email: "" };

      for (const entry of entries) {
        // Resolve underlying entry functions
        const keyInfo = entry.key ? (typeof entry.key === 'function' ? entry.key() : entry.key) : null;
        if (!keyInfo) continue;

        const key = keyInfo.sym ? keyInfo.sym().toString() : keyInfo.toString();
        const vInfo = entry.val ? (typeof entry.val === 'function' ? entry.val() : entry.val) : null;
        if (!vInfo) continue;

        if (key === 'emp_id' || key === 'empId') {
          obj.empId = Number(vInfo.u128().lo().toString());
        } else if (key === 'rem_salary' || key === 'salary') {
          obj.rem_salary = Number(vInfo.u128().lo().toString());
        } else if (key === 'wallet' || key === 'address') {
          try {
            // The most robust way to extract a ScVal using modern JS SDKs is scValToNative
            obj.wallet = scValToNative(vInfo);
          } catch (e) {
            console.error("Failed to Native-Cast Wallet. Falling back.", e);
            obj.wallet = JSON.stringify(vInfo);
          }
        }
      }

      return obj;
    };


    //same as getEmployeeDetails but calls get_emp_with_wa and uses wallet address instead of empId
    const account = await server.getAccount(publicKey);
    const contract = new Contract(CONTRACT_ADDRESS_WAGE);

    const operation = contract.call("get_emp_with_wa", addressToScVal(publicKey));

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(transaction);

    if (!simResult.result) throw new Error("Employee not found or simulation failed");

    // Read-only query: Extract the return value directly from the simulation result
    // avoiding Freighter prompts and network submission for fetching profiles.
    return parseFields(simResult.result.retval);
  }
  catch (error) {
    console.error("Error getting employee with wallet address:", error);
    throw error
  }
}

/**
 * Get remaining salary for an employee
 * @param {string} publicKey - The caller's public key
 * @param {number} empId - Employee ID
 */
export async function getRemainingSalary(publicKey, empId) {
  try {
    const account = await server.getAccount(publicKey);
    const contract = new Contract(CONTRACT_ADDRESS_WAGE);

    const operation = contract.call("get_remaining_salary", numberToU128(empId));

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    const simResult = await server.simulateTransaction(transaction);

    if (simResult.result) {
      const resultValue = xdr.ScVal.fromXDR(simResult.result.retval.toXDR());
      return Number(resultValue.u128().lo().toString());
    }
    return 0;
  } catch (error) {
    console.error("Error getting remaining salary:", error);
    return 0;
  }
}

/**
 * Release remaining salary to employee
 * @param {string} publicKey - The caller's public key
 * @param {number} empId - Employee ID
 * @param {string} tokenAddress - Token contract address
 * @param {number} newSalary - New salary amount for next cycle
 */
export async function releaseRemainingSalary(
  publicKey,
  empId,
  tokenAddress = CONTRACT_ADDRESS_TOKEN,
  newSalary
) {
  const args = [
    numberToU128(empId),
    addressToScVal(tokenAddress),
    numberToU128(newSalary),
  ];

  const preparedTx = await buildContractCall(
    publicKey,
    CONTRACT_ADDRESS_WAGE,
    "release_remaining_salary",
    args
  );

  const signedTx = await signWithFreighter(preparedTx);
  return submitTransaction(signedTx);
}

// Export contract addresses for reference
export const CONTRACTS = {
  TOKEN: CONTRACT_ADDRESS_TOKEN,
  WAGE: CONTRACT_ADDRESS_WAGE,
  RPC_URL,
};

export default {
  registerEmployee,
  depositToVault,
  requestAdvance,
  getVaultBalance,
  getEmployeeDetails,
  getRemainingSalary,
  releaseRemainingSalary,
  CONTRACTS,
};

