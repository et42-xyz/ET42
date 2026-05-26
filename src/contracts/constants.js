import { bsc, mainnet, xLayer } from "wagmi/chains";

export const SUPPORTED_CHAIN_IDS = [bsc.id, mainnet.id, xLayer.id];

export const DEFAULT_CHAIN_ID = mainnet.id;

export const BSC_CHAIN_ID = bsc.id;
export const ETH_CHAIN_ID = mainnet.id;
export const XLAYER_CHAIN_ID = xLayer.id;

// Contract address map keyed by chainId.
// Empty string means the contract is not deployed on that chain.
export const CONTRACT_ADDRESSES = {
  [bsc.id]: {
    MARKETPLACE: process.env.REACT_APP_MARKETPLACE_CONTRACT_ADDRESS || "",
    USDT: "0x0000000000000000000000000000000000000000",
    MEME_LAUNCHPAD: "0x0000000000000000000000000000000000000000",
    NFT_LAUNCHPAD: "0x0000000000000000000000000000000000000000",
  },
  // ... 2 additional chains follow the same shape (mainnet, xLayer)
};

export const getContractAddress = (chainId, key) =>
  CONTRACT_ADDRESSES[chainId]?.[key] || "";

// USDT decimals differ per chain: BSC USDT uses 18 decimals,
// while standard Tether USDT on ETH and XLayer uses 6 decimals.
export const USDT_DECIMALS = {
  [bsc.id]: 18,
  [mainnet.id]: 6,
  [xLayer.id]: 6,
};

export const getUsdtDecimals = (chainId) =>
  USDT_DECIMALS[chainId] ?? USDT_DECIMALS[DEFAULT_CHAIN_ID];

export const EXPLORER_TX_URLS = {
  [bsc.id]: "https://bscscan.com/tx/",
  [mainnet.id]: "https://etherscan.io/tx/",
  [xLayer.id]: "https://www.oklink.com/xlayer/tx/",
};

export const getExplorerTxUrl = (chainId) =>
  EXPLORER_TX_URLS[chainId] || EXPLORER_TX_URLS[DEFAULT_CHAIN_ID];

// Tether USDT on ETH mainnet does not return bool from approve(); the ABI
// must be adjusted and prior allowance reset to 0 first.
export const isEthTetherUsdt = (chainId, tokenAddress) => {
  if (chainId !== mainnet.id || !tokenAddress) return false;
  return tokenAddress.toLowerCase() === CONTRACT_ADDRESSES[mainnet.id]?.USDT?.toLowerCase();
};
