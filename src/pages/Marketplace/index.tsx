import "./index.scss";
import { useState, useEffect } from "react";
import Hot from "./Hot";
import NftMint from "./NftMint";
import homeBgi from "@/imgs/home-bgi.png";
import Axios from "@/api/index";
import { useTranslation } from "react-i18next";

export default function Marketplace() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("trending");
  const [searchText] = useState("");
  const [list, setList] = useState([]);
  const [tokenTotal, setTokenTotal] = useState(0);
  const [tokenPage, setTokenPage] = useState(1);
  const tokenPageSize = 20;
  const [mintList, setMintList] = useState([]);
  const [mintTotal, setMintTotal] = useState(0);
  const [mintPage, setMintPage] = useState(1);
  const mintPageSize = 20;

  const fetchTokenList = (pageIndex = tokenPage, pageSize = tokenPageSize) => {
    Axios.tokenList({ pageIndex, pageSize }).then((res) => {
      if (res.code == 200) {
        setList(res.data?.list ?? res.data ?? []);
        setTokenTotal(res.data?.total ?? 0);
      }
    });
  };

  const fetchMintList = (pageIndex: number) => {
    Axios.nftlaunchpadList({ pageIndex, pageSize: mintPageSize }).then((res) => {
      if (res.code == 200) {
        setMintList(res.data?.list ?? res.data ?? []);
        setMintTotal(res.data?.total ?? 0);
      }
    });
  };

  useEffect(() => {
    fetchTokenList(1, tokenPageSize);
    fetchMintList(1);
  }, []);

  // Refresh the active tab's list every 10s.
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === "trending") {
        fetchTokenList(tokenPage, tokenPageSize);
      } else if (activeTab === "mint") {
        fetchMintList(mintPage);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab, mintPage, tokenPage]);

  return (
    <div className="home-page">
      <div className="hero-section">
        <img src={homeBgi} alt="" className="hero-bg-img" />
      </div>

      <div className="list-section">
        <div className="list-container">
          <div className="tab-search-row">
            <div className="tab-switcher">
              <button
                className={`tab-btn${activeTab === "trending" ? " active" : ""}`}
                onClick={() => setActiveTab("trending")}
              >
                {t("marketplace.trending")}
              </button>
              <button
                className={`tab-btn${activeTab === "mint" ? " active" : ""}`}
                onClick={() => setActiveTab("mint")}
              >
                {t("marketplace.mint")}
              </button>
            </div>
          </div>

          {activeTab === "mint" ? (
            <NftMint
              searchText={searchText}
              list={mintList}
              total={mintTotal}
              pageIndex={mintPage}
              pageSize={mintPageSize}
              onPageChange={(page: number) => {
                setMintPage(page);
                fetchMintList(page);
              }}
            />
          ) : (
            <Hot
              searchText={searchText}
              list={list}
              total={tokenTotal}
              pageIndex={tokenPage}
              pageSize={tokenPageSize}
              onPageChange={(page: number) => {
                setTokenPage(page);
                fetchTokenList(page, tokenPageSize);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
