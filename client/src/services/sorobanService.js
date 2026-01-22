import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  Networks,
  rpc,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

// Contract addresses - Update these with your deployed contract addresses
const CONTRACT_ADDRESS_TOKEN = "CDB5EWYMHLVBUCF34JKI6V53DLV6IKZPABNTPGXRR7L5XUVDBKE2ZSA3";
const CONTRACT_ADDRESS_WAGE = "CAHEHF7DFQKQBBG6SRQF6U3P6WWDIIP6UAZXEPZAXMXYYYLIS7L7MJTN";
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
  if (!window.freighterApi) {
    throw new Error("Freighter wallet not found");
  }

  const txXdr = preparedTx.toXDR();
  const signedTxXdr = await window.freighterApi.signTransaction(txXdr, {
    network: "TESTNET",
    networkPassphrase: Networks.TESTNET,
  });

  return TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
}

// Submit signed transaction
async function submitTransaction(signedTx) {
  try {
    const response = await server.sendTransaction(signedTx);

    if (response.status === "PENDING") {
      let txResponse = await server.getTransaction(response.hash);

      while (txResponse.status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        txResponse = await server.getTransaction(response.hash);
      }

      if (txResponse.status === "SUCCESS") {
        return {
          success: true,
          hash: response.hash,
          result: txResponse.resultXdr,
        };
      } else {
        throw new Error(`Transaction failed: ${txResponse.status}`);
      }
    } else if (response.status === "ERROR") {
      throw new Error(`Transaction error: ${response.errorResultXdr}`);
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

