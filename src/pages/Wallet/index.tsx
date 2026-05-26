import { Table } from "antd";
import "./index.scss";
import notLoginIcon from "@/imgs/not-login-ico.png";
import avatar from "@/imgs/avatar.png";
import { useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import EllipsisMiddle from "@/components/EllipsisMiddle";
import { limitDecimals } from "@/lib/numbers";
import { useGetUsdPrice, useNativePrice } from "@/hooks/useNativePrice";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Axios from "@/api/index";
import BigNumber from "bignumber.js";
import { getNetworkImg } from "@/lib/utils";
import KlineChange from "@/components/Common/KlineChange";
import { useTranslation } from "react-i18next";
import { useChainId, useConfig, usePublicClient } from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc20Abi, formatUnits } from "viem";
import { getContractAddress, getUsdtDecimals } from "@/contracts";

function Wallet() {
  const { t } = useTranslation();
  const nativePrice = useNativePrice();
  const { openConnectModal } = useConnectModal();
  const { getUsdPrice } = useGetUsdPrice();
  const { account } = useSelector(({ user }) => user);

  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const usdtAddress = getContractAddress(chainId, "USDT");
  const usdtDecimals = getUsdtDecimals(chainId);
  const isEth = chainId === mainnet.id;
  const nativeSymbol = isEth ? "ETH" : "BNB";

  const [tokenList, setTokenList] = useState<any[]>([]);
  const [listLoading] = useState(false);

  // viem multicall: fetch native + USDT + per-token balances in one round-trip,
  // then prepend synthetic native/USDT rows to the supported-token list.
  useEffect(() => {
    if (!account || !publicClient) return;
    Axios.allSupportTokens().then(async (res) => {
      if (res.code != 200) return;
      const tokens = res.data;

      try {
        const balanceCalls = [
          ...(usdtAddress
            ? [{
                address: usdtAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "balanceOf" as const,
                args: [account as `0x${string}`],
              }]
            : []),
          ...tokens.map((t: any) => ({
            address: t.tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [account as `0x${string}`],
          })),
        ];

        const [nativeBalance, multicallResult] = await Promise.all([
          publicClient.getBalance({ address: account as `0x${string}` }),
          publicClient.multicall({ contracts: balanceCalls, allowFailure: true } as any),
        ]);

        const usdtOffset = usdtAddress ? 1 : 0;
        const usdtRaw =
          usdtAddress && multicallResult[0]?.status === "success"
            ? (multicallResult[0].result as bigint)
            : BigInt(0);

        const newList = tokens.map((t: any, i: number) => {
          const result = multicallResult[i + usdtOffset];
          const raw = result?.status === "success" ? (result.result as bigint) : BigInt(0);
          return { ...t, amount: formatUnits(raw, 18) };
        });

        const nativeItem = {
          id: "__native__",
          name: nativeSymbol,
          tokenAddress: "-",
          floorPrice: nativePrice,
          amount: limitDecimals(formatUnits(nativeBalance, 18), 6),
        };
        const usdtItem = {
          id: "__usdt__",
          name: "USDT",
          tokenAddress: usdtAddress || "-",
          floorPrice: 1,
          amount: limitDecimals(formatUnits(usdtRaw, usdtDecimals), 3),
        };

        setTokenList([nativeItem, usdtItem, ...newList]);
      } catch (e) {
        console.error("multicall getTokenBalance error:", e);
      }
    });
  }, [account, publicClient, usdtAddress, usdtDecimals, nativeSymbol, nativePrice]);

  // ... fetch NFT holdings via tokensOfOwner multicall (omitted)
  // ... split / synthesize / transfer NFT flows (omitted, see source)

  const columns = [
    {
      title: t("wallet.columns.name"),
      dataIndex: "symbol",
      render: (text: string, record: any) => (
        <div className="assets-symbol">
          <img
            src={getNetworkImg(record.image || record.name)}
            alt=""
            className="token-icon"
            onError={(e) => {
              (e.target as HTMLImageElement).src = notLoginIcon;
            }}
          />
          <div className="token-info">
            <span className="token-name">{text || record.name}</span>
          </div>
        </div>
      ),
    },
    {
      title: t("wallet.columns.floorPrice"),
      dataIndex: "floorPrice",
      render: (text: number) => <span>${limitDecimals(text || 0, 6)}</span>,
    },
    {
      title: t("wallet.columns.change24h"),
      dataIndex: "floorPrice",
      render: (text: number, record: any) => {
        if (record.dayOpenPrice && record.dayOpenPrice > 0) {
          const pct = limitDecimals(((text - record.dayOpenPrice) / record.dayOpenPrice) * 100, 2);
          return <KlineChange change={pct} />;
        }
        return <span>--</span>;
      },
    },
    {
      title: t("wallet.columns.amount"),
      dataIndex: "amount",
      render: (text: number) => <span>{text || 0}</span>,
    },
    {
      title: t("wallet.columns.value"),
      render: (_: any, record: any) => {
        if (record.amount && record.floorPrice) {
          const value = BigNumber(record.floorPrice).multipliedBy(record.amount).toFixed();
          return <span>{` ≈ ${getUsdPrice(value)}`}</span>;
        }
        return <span>0</span>;
      },
    },
    // ... action column with Trade / Fragment buttons (omitted)
  ];

  const totalSTAT = useMemo(() => {
    let total = 0;
    for (const t of tokenList) {
      if (t.amount && t.floorPrice) {
        total += Number(BigNumber(t.floorPrice).multipliedBy(t.amount).toFixed());
      }
    }
    return total;
  }, [tokenList]);

  return (
    <div className="wallet">
      <div className="my-assets">
        {!account ? (
          <div className="not-login-status">
            <img src={notLoginIcon} alt="" />
            <button className="connect-btn" onClick={() => openConnectModal?.()}>
              {t("wallet.connectWallet")}
            </button>
          </div>
        ) : (
          <div className="login-status">
            <div className="profile-left">
              <img className="profile-avatar" src={avatar} alt="" />
              <span className="profile-addr-text">
                <EllipsisMiddle suffixCount={10}>{account}</EllipsisMiddle>
              </span>
            </div>
            <div className="profile-stats">
              <span className="profile-stat-label">{t("wallet.totalBalance")}</span>
              <span className="profile-stat-value">
                {totalSTAT ? limitDecimals(totalSTAT, 3) : "0"} USDT
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="wallet-list-section">
        <Table
          loading={listLoading}
          columns={columns}
          dataSource={tokenList.filter((t) => Number(t.amount) > 0)}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 9, showSizeChanger: false }}
        />
      </div>

      {/* ... NFT grid tab, Fragment / Split / Transfer modals (omitted, see source) */}
    </div>
  );
}

export default Wallet;
