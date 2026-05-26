/* global BigInt */
import { useChainId, useAccount, useConfig, useReadContract } from "wagmi";
import { readContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, parseEventLogs } from "viem";
import { marketplaceABI } from "../abi/marketplace";
import { getContractAddress, getUsdtDecimals } from "../constants";

// Project tokens are pinned to 18 decimals.
const toWei = (value) => parseUnits(String(value), 18);
const fromWei = (value) => (value == null ? "0" : formatUnits(BigInt(value), 18));

export function useMarketplace() {
  const config = useConfig();
  const chainId = useChainId();
  const { address } = useAccount();

  // unitPrice is USDT/token; scale by current chain's USDT decimals (BSC=18, ETH=6).
  const usdtDecimals = getUsdtDecimals(chainId);
  const toUsdt = (value) => parseUnits(String(value), usdtDecimals);

  const ensureAddress = () => {
    const addr = getContractAddress(chainId, "MARKETPLACE");
    if (!addr) throw new Error("Marketplace not deployed on the current chain");
    return addr;
  };

  const sendTx = async (functionName, args) => {
    const target = ensureAddress();
    const hash = await writeContract(config, {
      address: target,
      abi: marketplaceABI,
      functionName,
      args,
      account: address,
    });
    const receipt = await waitForTransactionReceipt(config, { hash });
    return { ...receipt, transactionHash: receipt.transactionHash };
  };

  // Parse event logs after createOrder so caller gets the on-chain orderId.
  const sendCreateOrder = async (functionName, args, eventName) => {
    const target = ensureAddress();
    const hash = await writeContract(config, {
      address: target,
      abi: marketplaceABI,
      functionName,
      args,
      account: address,
    });
    const receipt = await waitForTransactionReceipt(config, { hash });
    const logs = parseEventLogs({ abi: marketplaceABI, logs: receipt.logs, eventName });
    const orderId = logs[0]?.args?.orderId;
    return {
      ...receipt,
      transactionHash: receipt.transactionHash,
      orderId: orderId != null ? String(orderId) : null,
    };
  };

  return {
    // amount is token-18; unitPrice scales by per-chain USDT decimals.
    createSellOrder: (tokenAddress, amount, unitPrice) =>
      sendCreateOrder(
        "createSellOrder",
        [tokenAddress, toWei(amount), toUsdt(unitPrice)],
        "SellOrderCreated"
      ),

    cancelSellOrder: (orderId) => sendTx("cancelSellOrder", [BigInt(orderId)]),

    // ... additional marketplace hooks omitted: createBuyOrder, acceptBuy/SellOrder,
    //     batchAcceptBuy/SellOrders, cancelBuyOrder, plus read helpers
    //     (sellOrders, buyOrders, getBuyOrdersCount, feePercent, ...)
  };
}

export function useFeePercent() {
  const chainId = useChainId();
  const address = getContractAddress(chainId, "MARKETPLACE");
  return useReadContract({
    address,
    abi: marketplaceABI,
    functionName: "feePercent",
    query: { enabled: !!address },
  });
}
