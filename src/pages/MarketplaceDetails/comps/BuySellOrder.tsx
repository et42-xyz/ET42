import { Slider, Modal, Progress, Button } from "antd";
import { getNetworkImg } from "@/lib/utils";
import { useSelector } from "react-redux";
import { useState, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from "react";
import { limitDecimals } from "@/lib/numbers";
import eventBus from "@/lib/eventBus";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { useMarketplace, useErc20 } from "@/contracts";

export default forwardRef(function BuySellOrder(props: any, ref: any) {
  const { t } = useTranslation();
  const marketplace = useMarketplace();
  const erc20 = useErc20();
  const { isModalOpen, handleCancel, currentOrder, token } = props;
  const { account } = useSelector(({ user }) => user);

  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentAllowance, setCurrentAllowance] = useState(0);
  const [maxVolume, setMaxVolume] = useState(0);
  const [buySellAmount, setBuySellAmount] = useState(0);
  const [sliderValue, setSliderValue] = useState(100);
  const [btnLoading, setBtnLoading] = useState(false);
  // Authoritative remaining amount fetched from chain right before submitting,
  // to guard against stale data from the backend cache.
  const [effectiveAmount, setEffectiveAmount] = useState(0);

  useImperativeHandle(ref, () => ({ getTokenBalance }));

  // Fetch token + allowance: USDT side for accept-sell-order, token side for accept-buy-order.
  // The Promise.all keeps the round-trip count down.
  const getTokenBalance = async () => {
    if (!currentOrder || currentOrder.orderId == null) return 0;
    const isUsdtSide = currentOrder.type === "Sell";
    const tokenAddr = currentOrder.tokenAddress;
    const [rawBalance, rawAllowance] = await Promise.all([
      isUsdtSide ? erc20.balanceOfUsdt(account) : erc20.balanceOf(tokenAddr, account),
      isUsdtSide ? erc20.allowanceUsdt(account) : erc20.allowance(tokenAddr, account),
    ]);
    const formatRaw = isUsdtSide ? erc20.formatUsdt : erc20.fromWei;
    setCurrentBalance(Number(formatRaw(rawBalance)));
    setCurrentAllowance(Number(formatRaw(rawAllowance)));
    return { balance: formatRaw(rawBalance), allowance: formatRaw(rawAllowance) };
  };

  // ... balance/slider sync useEffects (omitted)

  const memoTotalValue = useMemo(() => {
    const price = currentOrder?.unitPrice;
    if (!price || !buySellAmount) return 0;
    return new BigNumber(limitDecimals(price * Number(buySellAmount), 10, "round")).toFixed();
  }, [currentOrder, buySellAmount]);

  // State machine: insufficient balance → go-to-wallet button;
  //                allowance < total → approve button;
  //                otherwise → execute button.
  const getActionButton = () => {
    const isBuy = currentOrder.type === "Sell";
    const requirement = isBuy ? Number(memoTotalValue) : Number(buySellAmount);

    if (Number(currentBalance) < requirement) {
      return <Button className="buy-btn">{t("createOrder.insufficientBalance")}</Button>;
    }
    if (Number(currentAllowance) < requirement) {
      const handler = isBuy ? onApproveUSDT : onApprove;
      return (
        <Button className="buy-btn" onClick={handler} loading={btnLoading}>
          {isBuy ? t("createOrder.approveUSDT") : t("createOrder.approve")}
        </Button>
      );
    }
    return (
      <Button className="buy-btn" onClick={buySellSubmit} loading={btnLoading}>
        {isBuy
          ? t("createOrder.buySymbol", { symbol: token })
          : t("createOrder.sellSymbol", { symbol: token })}
      </Button>
    );
  };

  const buySellSubmit = async () => {
    if (!buySellAmount) return;
    setBtnLoading(true);
    try {
      // Re-fetch on-chain order right before submit to dodge backend cache drift
      // that would otherwise revert the tx with an obscure error.
      const onchain: any =
        currentOrder.type === "Sell"
          ? await marketplace.sellOrders(currentOrder.orderId)
          : await marketplace.buyOrders(currentOrder.orderId);

      const onchainAmount = Number(onchain.amount);
      const localAmount = Number(effectiveAmount);

      if (onchainAmount === 0) {
        window.$message.warning(t("buySellOrder.orderTraded"));
        handleCancel();
        eventBus.emit("refreshMarketList", currentOrder.type, currentOrder.orderId);
        return;
      }

      // Tolerate tiny FP drift; otherwise sync the modal cap and ask user to retry.
      if (Math.abs(onchainAmount - localAmount) > 1e-9) {
        window.$message.warning(t("buySellOrder.orderRefreshed"));
        setEffectiveAmount(onchainAmount);
        setMaxVolume(onchainAmount);
        setBuySellAmount(onchainAmount);
        setSliderValue(100);
        eventBus.emit("refreshMarketList", currentOrder.type, currentOrder.orderId);
        return;
      }

      const ret: any =
        currentOrder.type == "Sell"
          ? await marketplace.acceptSellOrder(currentOrder.orderId, buySellAmount)
          : await marketplace.acceptBuyOrder(currentOrder.orderId, buySellAmount);

      if (ret.transactionHash) {
        window.$message.success(t("createOrder.submitSuccess"));
        handleCancel();
        setTimeout(() => eventBus.emit("refreshMarketList", currentOrder.type, currentOrder.orderId), 6000);
      }
    } finally {
      setBtnLoading(false);
    }
  };

  // ... onApproveUSDT / onApprove callbacks (same shape, omitted)

  return (
    <Modal open={isModalOpen} onCancel={handleCancel} footer={null} width={400}>
      {/* ... amount + slider + total preview (omitted) */}
      <div className="btn">{getActionButton()}</div>
    </Modal>
  );
});
