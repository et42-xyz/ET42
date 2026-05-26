/* global BigInt */
import { useChainId, useAccount, useConfig, useReadContract } from "wagmi";
import { readContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, maxUint256 } from "viem";
import { getContractAddress, isEthTetherUsdt } from "../constants";

// Tether USDT on ETH mainnet does not return bool from approve(), so viem's default
// erc20Abi (which expects a bool) will reject the call with "returned no data".
// Strip the outputs to keep the write path working for that one token.
const usdtAbi = erc20Abi.map((fn) => (fn.name === "approve" ? { ...fn, outputs: [] } : fn));

export function useErc20() {
  const config = useConfig();
  const chainId = useChainId();
  const { address: account } = useAccount();

  const marketplace = getContractAddress(chainId, "MARKETPLACE");

  const allowance = (tokenAddress, owner = account, spender = marketplace) => {
    if (!tokenAddress || !owner || !spender) return Promise.resolve(0n);
    return readContract(config, {
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    });
  };

  // Handles two quirks of ETH Tether USDT:
  //  1. approve() returns no data → use the patched ABI
  //  2. allowance must be reset to 0 before changing to a non-zero value
  const approve = async (tokenAddress, spender = marketplace, amount) => {
    if (!tokenAddress || !spender) throw new Error("Missing token or spender for approve");
    const target = amount == null ? maxUint256 : amount;
    const isTether = isEthTetherUsdt(chainId, tokenAddress);
    const writeAbi = isTether ? usdtAbi : erc20Abi;

    if (isTether && account) {
      const current = await readContract(config, {
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, spender],
      });
      if (current > 0n && target !== 0n) {
        const zeroHash = await writeContract(config, {
          address: tokenAddress,
          abi: writeAbi,
          functionName: "approve",
          args: [spender, 0n],
          account,
        });
        await waitForTransactionReceipt(config, { hash: zeroHash });
      }
    }

    const hash = await writeContract(config, {
      address: tokenAddress,
      abi: writeAbi,
      functionName: "approve",
      args: [spender, target],
      account,
    });
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { ...receipt, transactionHash: receipt.transactionHash };
  };

  return {
    allowance,
    approve,
    // ... additional helpers omitted: balanceOf, getName (symbol),
    //     USDT shortcuts (balanceOfUsdt / allowanceUsdt / approveUsdt),
    //     formatters (fromWei / formatUsdt / formatUnits)
  };
}
