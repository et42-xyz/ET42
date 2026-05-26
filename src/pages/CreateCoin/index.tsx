/* global BigInt */
import "./index.scss";
import Upload from "@/components/Upload";
import { Input, Slider } from "antd";
import { useState } from "react";
import BaseButton from "@/components/BaseButton/index";
import API from "@/api/index";
import { useIsLoggedIn } from "@/hooks/useAuth";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseUnits } from "viem";
import { useCreateProject, toBytes32Salt } from "@/contracts";
import { useTranslation } from "react-i18next";

const { TextArea } = Input;

export default function CreateCoin() {
  const isLoggedIn = useIsLoggedIn();
  const { openConnectModal } = useConnectModal();
  const { createProject, reset: resetTx } = useCreateProject();
  const { t } = useTranslation();

  const [imageFileUrl, setImageFileUrl] = useState("");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [maxPortions, setMaxPortions] = useState(10000);
  const [portionPrice, setPortionPrice] = useState(1);

  const release = async () => {
    try {
      setLoading(true);
      // Backend returns a per-user salt nonce so the deployed token address
      // ends with a recognizable suffix (vanity address via CREATE2).
      const suffixAddress = await API.getSuffixAddressNonce({ chainId: 56 });
      if (!suffixAddress || suffixAddress.code !== 200 || !suffixAddress.data) {
        window.$message.error(t("createCoin.errors.suffixFailed"));
        return;
      }
      const salt = toBytes32Salt(suffixAddress.data);

      await createProject(
        salt,
        name,
        ticker,
        imageFileUrl,
        description,
        /* twitter */ "",
        /* telegram */ "",
        /* website */ "",
        BigInt(maxPortions),
        parseUnits(String(portionPrice), 18)
      );
      window.$message.success(t("createCoin.errors.createSuccess"));
    } catch (e: any) {
      window.$message.error(e?.shortMessage || t("createCoin.errors.createFailed"));
      resetTx();
    } finally {
      setLoading(false);
    }
  };

  const openBuyCoin = async () => {
    if (!isLoggedIn) {
      openConnectModal();
      return;
    }
    if (!imageFileUrl || !name || !ticker || !description) {
      window.$message.error(t("createCoin.errors.uploadImage"));
      return;
    }
    release();
  };

  return (
    <div id="coin-box">
      {/* ... image upload + name/ticker/description fields (omitted, see source) */}

      <div className="settings-box">
        <div className="setting-item">
          <Slider min={10000} max={500000} step={1} value={maxPortions} onChange={setMaxPortions} />
          <span>{maxPortions.toLocaleString()}</span>
        </div>
        <div className="setting-item">
          <Slider min={1} max={10} step={1} value={portionPrice} onChange={setPortionPrice} />
          <span>{portionPrice} USDT</span>
        </div>
      </div>

      {/* ... optional social links section (omitted) */}

      <BaseButton className="btns" onClick={openBuyCoin} loading={loading}>
        {t("createCoin.createBtn", { ticker: ticker ? "$" + ticker : "coin" })}
      </BaseButton>
    </div>
  );
}
