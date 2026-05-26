import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { setChainId } from "@/store/reducer/chainReducer";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } from "@/contracts/constants";

function readUrlChainId(search) {
  if (!search) return null;
  const params = new URLSearchParams(search);
  const v = Number(params.get("chainId"));
  return v > 0 ? v : null;
}

// Sync wagmi's current chainId to Redux + window global.
// Priority: URL chainId (deep link) > connected wallet chainId > default chain.
//
// Switch behaviour depends on who triggered the change:
// - URL chainId changed (first mount / user clicked a deep link) → actively call switchChain;
//   after the wallet settles, only reload the current page.
// - User changed chain in RainbowKit → navigate to home and reload, resetting all global state.
//   Do not push the chain back to the URL, to avoid fighting the user.
export function useSyncChainId() {
  const dispatch = useDispatch();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const location = useLocation();

  const prevWalletChainRef = useRef(null);
  const prevUrlChainRef = useRef(null);

  useEffect(() => {
    const urlChainId = readUrlChainId(location.search);
    const validUrl = !!urlChainId && SUPPORTED_CHAIN_IDS.includes(urlChainId);
    const urlTarget = validUrl ? urlChainId : null;

    let effective;
    if (validUrl) {
      effective = urlChainId;
    } else if (isConnected && SUPPORTED_CHAIN_IDS.includes(chainId)) {
      effective = chainId;
    } else {
      effective = DEFAULT_CHAIN_ID;
    }
    dispatch(setChainId(effective));
    window.__currentChainId__ = effective;

    if (!isConnected) {
      prevWalletChainRef.current = null;
      prevUrlChainRef.current = null;
      return;
    }

    const prevWallet = prevWalletChainRef.current;
    const prevUrl = prevUrlChainRef.current;
    prevWalletChainRef.current = chainId;
    prevUrlChainRef.current = urlTarget;

    if (validUrl && urlTarget !== prevUrl && chainId !== urlChainId) {
      try {
        switchChain({ chainId: urlChainId });
      } catch (e) {
        // user rejected / wallet error: ignore
      }
    }

    if (prevWallet != null && prevWallet !== chainId) {
      if (validUrl && chainId === urlChainId) {
        window.location.reload();
      } else {
        window.location.hash = "#/marketplace";
        window.location.reload();
      }
    }
  }, [chainId, isConnected, dispatch, switchChain, location.search]);
}
