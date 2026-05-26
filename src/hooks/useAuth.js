import { useEffect, useRef, useMemo, useCallback } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { initAccount, updateUserInfo, signOut } from "@/store/reducer/userReducer";
import { SUPPORTED_CHAIN_IDS } from "@/contracts/constants";
import API from "@/api/index";

export function useIsLoggedIn() {
  const { account } = useSelector(({ user }) => user);
  const { isConnected } = useAccount();
  const isLoggedIn = useMemo(
    () => isConnected && !!account && !!localStorage.getItem("x"),
    [isConnected, account]
  );
  return isLoggedIn;
}

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { address, isConnected, isDisconnected, chainId } = useAccount();
  const { account } = useSelector(({ user }) => user);
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const signingRef = useRef(false);
  const prevAddressRef = useRef(null);

  useEffect(() => {
    if (!isConnected || !address || signingRef.current) return;
    if (chainId && !SUPPORTED_CHAIN_IDS.includes(chainId)) return;

    const savedToken = localStorage.getItem("x");
    const savedAccount = sessionStorage.getItem("account");

    // Page refresh: token exists and address unchanged → skip signing, restore Redux state.
    if (savedToken && savedAccount && savedAccount.toLowerCase() === address.toLowerCase()) {
      prevAddressRef.current = address;
      if (!account) {
        dispatch(initAccount(address));
      }
      return;
    }

    if (address === prevAddressRef.current && savedToken) return;

    signingRef.current = true;
    prevAddressRef.current = address;

    handleLogin(address).finally(() => {
      signingRef.current = false;
    });
  }, [isConnected, address, chainId]);

  const handleLogin = async (addr) => {
    // 1. Fetch sign-message challenge from backend
    const res = await API.getSignMessage({ address: addr });
    if (res.code != 200) throw new Error("Failed to get sign message");

    // 2. Prompt wallet for signature
    const sign = await signMessageAsync({ message: res.data });

    // 3. Submit signature; backend returns JWT
    const loginRes = await API.login({ signMessage: res.data, address: addr, sign });
    if (loginRes.code == 200) {
      localStorage.setItem("x", loginRes.data.token);
      delete loginRes.data.token;
      dispatch(initAccount(addr));
      dispatch(updateUserInfo(loginRes.data));
    }
    // ... error branches (disconnect on failure, redirect, toast) omitted
  };

  // ... useEffect for disconnect / handleSignOut omitted
}
