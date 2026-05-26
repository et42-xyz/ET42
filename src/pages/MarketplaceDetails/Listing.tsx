import { Card, Pagination, List } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { useOutletContext } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { getQueryVariable, shortenAddress, getNetworkImg } from "@/lib/utils";
import "./index.scss";
import eventBus from "@/lib/eventBus";
import Axios from "@/api/index";
import BuySellOrder from "./comps/BuySellOrder";
import { limitDecimals } from "@/lib/numbers";
import BigNumber from "bignumber.js";
import { useIsLoggedIn, useTriggerLogin } from "@/hooks/useAuth";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTranslation } from "react-i18next";
import { useMarketplace, useErc20 } from "@/contracts";

export default function Listing() {
  const marketplace = useMarketplace();
  const erc20 = useErc20();
  const [token] = useState(getQueryVariable("token") || "TAPROOT");
  const { account } = useSelector(({ user }) => user);
  const isLoggedIn = useIsLoggedIn();
  const { isConnected } = useAccount();
  const triggerLogin = useTriggerLogin();
  const { openConnectModal } = useConnectModal();
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(12);
  const [pageIndex, setPageIndex] = useState(1);
  const [newList, setNewList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentTokenInfo, type, syncFloorFromListing] = useOutletContext<any[]>();
  const childRef = useRef<any>();

  const [selectedOrders, setSelectedOrders] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const totalBatchUsdt = useMemo(
    () => selectedOrders.reduce((sum, o) => sum + Number(o.unitPrice) * Number(o.amount), 0),
    [selectedOrders]
  );
  const totalBatchTokenAmount = useMemo(
    () => selectedOrders.reduce((sum, o) => sum + Number(o.amount), 0),
    [selectedOrders]
  );

  function getOrderList() {
    Axios.orderList({
      type,
      pageIndex,
      pageSize,
      sort: "unitPrice",
      sortType: type == "Buy" ? "DESC" : "ASC",
      tokenAddress: currentTokenInfo.tokenAddress,
    }).then((res) => {
      if (res.code == 200) {
        const listData = res.data.list ?? [];
        setNewList(listData);
        setTotal(res.data.total);
        if (type == "Sell" && pageIndex == 1) syncFloorFromListing?.(listData[0] ?? null, type);
      }
    });
  }

  useEffect(() => {
    if (currentTokenInfo.tokenAddress) getOrderList();
  }, [pageSize, pageIndex, type, currentTokenInfo]);

  // ... eventBus refresh subscription + 10s polling on page 1 (omitted)

  // Batch submit: balance/allowance preflight, then send one batch tx.
  // No confirmation modal — cards already showed the totals row.
  const handleBatchSubmit = async () => {
    if (selectedOrders.length === 0 || batchLoading) return;
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (!isLoggedIn) {
      const ok = await triggerLogin();
      if (!ok) return;
    }

    setBatchLoading(true);
    try {
      const firstOrder = selectedOrders[0];
      const isUsdtSide = firstOrder.type === "Sell";
      const tokenAddr = firstOrder.tokenAddress;

      const fetchBalanceAllowance = async () => {
        const [rawBalance, rawAllowance] = await Promise.all([
          isUsdtSide ? erc20.balanceOfUsdt(account) : erc20.balanceOf(tokenAddr, account),
          isUsdtSide ? erc20.allowanceUsdt(account) : erc20.allowance(tokenAddr, account),
        ]);
        const formatRaw = isUsdtSide ? erc20.formatUsdt : erc20.fromWei;
        return { balance: formatRaw(rawBalance), allowance: formatRaw(rawAllowance) };
      };

      const balanceData = await fetchBalanceAllowance();
      const balance = Number(balanceData.balance);
      let allowance = Number(balanceData.allowance);
      const required = type === "Sell" ? totalBatchUsdt : totalBatchTokenAmount;

      if (balance < required) {
        window.$message.error(t("createOrder.insufficientBalance"));
        return;
      }

      if (allowance < required) {
        const approveRet =
          type === "Sell" ? await erc20.approveUsdt() : await erc20.approve(tokenAddr);
        if (!approveRet.transactionHash) {
          window.$message.error(t("createOrder.approveError"));
          return;
        }
        const refreshed = await fetchBalanceAllowance();
        allowance = Number(refreshed.allowance);
        if (allowance < required) return;
      }

      const orderIds = selectedOrders.map((o) => o.orderId);
      const amounts = selectedOrders.map((o) => o.amount);
      const ret: any =
        type === "Sell"
          ? await marketplace.batchAcceptSellOrders(orderIds, amounts)
          : await marketplace.batchAcceptBuyOrders(orderIds, amounts);

      if (ret.transactionHash) {
        window.$message.success(t("createOrder.submitSuccess"));
        setSelectedOrders([]);
        setTimeout(() => getOrderList(), 6000);
      }
    } catch (e: any) {
      window.$message.error(e?.message || t("createOrder.submitFail"));
    } finally {
      setBatchLoading(false);
    }
  };

  // ... single-order modal flow (showModal / toggleSelect / pagination handlers) omitted

  return (
    <>
      <div className="listing">
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={newList}
          rowKey="orderId"
          renderItem={(item: any) => {
            const isSelected = selectedOrders.some((o) => o.orderId === item.orderId);
            const total = new BigNumber(item.unitPrice).times(new BigNumber(item.amount)).toFixed(6);
            return (
              <List.Item>
                <Card className={`card-box ${isSelected ? "card-selected" : ""}`}>
                  {/* ... header, progress bar, amount/price, seller row (omitted) */}
                  <div className="card-total-row">
                    <span>{limitDecimals(total, 6)} USDT</span>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
        <Pagination
          current={pageIndex}
          pageSize={pageSize}
          total={total}
          onChange={(page, ps) => {
            setPageIndex(page);
            setPageSize(ps);
          }}
        />
      </div>

      {selectedOrders.length > 0 && (
        <div className="batch-acceptorder">
          <span>{t("listing.batchSelected", { count: selectedOrders.length })}</span>
          <span>{limitDecimals(totalBatchUsdt, 6)} USDT</span>
          <button onClick={handleBatchSubmit} disabled={batchLoading}>
            {type === "Sell"
              ? t("listing.batchBuy", { count: selectedOrders.length })
              : t("listing.batchSell", { count: selectedOrders.length })}
          </button>
        </div>
      )}

      <BuySellOrder ref={childRef} token={token} /* ...other props */ />
    </>
  );
}
