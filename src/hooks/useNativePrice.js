import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useChainId } from "wagmi";
import { bsc, mainnet, xLayer } from "wagmi/chains";
import BigNumber from "bignumber.js";
import { setNativePrice } from "@/store/reducer/marketReducer";
import { limitDecimals } from "@/lib/numbers";

const NATIVE_META = {
  [bsc.id]: { id: "binancecoin", symbol: "BNB" },
  [mainnet.id]: { id: "ethereum", symbol: "ETH" },
  [xLayer.id]: { id: "okb", symbol: "OKB" },
};
const DEFAULT_SYMBOL = "BNB";

const CACHE_TTL = 6 * 60 * 60 * 1000;
const cacheKey = (chainId) => `native_usd_${chainId}`;
const cacheTsKey = (chainId) => `native_usd_ts_${chainId}`;

async function fetchNativePrice(chainId) {
  const meta = NATIVE_META[chainId];
  if (!meta) return 0;

  const cached = localStorage.getItem(cacheKey(chainId));
  const ts = Number(localStorage.getItem(cacheTsKey(chainId)) || 0);
  if (cached && Date.now() - ts < CACHE_TTL) return Number(cached);

  try {
    const res = await axios.get("https://api.coingecko.com/api/v3/simple/price", {
      params: { ids: meta.id, vs_currencies: "usd" },
    });
    const price = Number(res?.data?.[meta.id]?.usd ?? 0);
    if (price > 0) {
      localStorage.setItem(cacheKey(chainId), String(price));
      localStorage.setItem(cacheTsKey(chainId), String(Date.now()));
    }
    return price;
  } catch {
    return Number(cached || 0);
  }
}

export function useSyncNativePrice() {
  const dispatch = useDispatch();
  const chainId = useChainId();
  useEffect(() => {
    let cancelled = false;
    fetchNativePrice(chainId).then((price) => {
      if (!cancelled && price > 0) dispatch(setNativePrice({ chainId, price }));
    });
    return () => {
      cancelled = true;
    };
  }, [chainId, dispatch]);
}

export function useNativePrice() {
  const chainId = useChainId();
  const prices = useSelector(({ market }) => market.nativePrices);
  return Number(prices?.[chainId] || 0);
}

export function useNativeSymbol() {
  const chainId = useChainId();
  return NATIVE_META[chainId]?.symbol || DEFAULT_SYMBOL;
}

export function useGetUsdPrice() {
  const getUsdPrice = (value, maxDecimals = 3) => {
    if (value === undefined || value === null) return "$0";
    return "$" + limitDecimals(new BigNumber(value).toFixed(), maxDecimals);
  };
  return { getUsdPrice };
}
