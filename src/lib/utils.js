import BigNumber from "bignumber.js";
import btcIco from "@/imgs/btc-ico.png";
import usdtIco from "@/imgs/usdt-ico.png";
import bnbIco from "@/imgs/bnb-ico.png";
import ethIco from "@/imgs/ETH.png";

export function getNetworkImg(img) {
  if (img === "BTC") return btcIco;
  if (img === "USDT") return usdtIco;
  if (img === "BNB") return bnbIco;
  if (img == "ETH") return ethIco;
  return "https://cdn.example.com/assets/" + img;
}

export function getKlineChange(lastKline) {
  return (((lastKline.close_price - lastKline.open_price) / lastKline.open_price) * 100).toFixed(2);
}

export function finLastKline(data) {
  let date = new Date().getDate();
  for (let i = 0; i < data.length; i++) {
    let currentDate = new Date(data[i].date).getDate();
    if (currentDate == date) {
      return data[i];
    }
  }
  return false;
}

export function handleKlineData(data) {
  let xdata = [];
  let ydata = [];
  let volume = [];

  data.map((res) => {
    let timer = new Date(res.timestamp);
    ydata.push(new BigNumber(res.close).toFixed());
    xdata.push(`${addZero(timer.getHours())}:${addZero(timer.getMinutes())}:${addZero(timer.getSeconds())}`);
    volume.push(res.volume);
  });
  return {
    xdata,
    ydata,
    volume,
  };
}

export function addZero(num) {
  return num <= 9 ? "0" + num : num;
}

export function getQueryVariable(variable) {
  var str = window.location.href.split("?");
  var query = str[1];
  if (query) {
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] == variable) {
        return decodeURIComponent(pair[1]);
      }
    }
  }
  return "";
}

export function sleep(time = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
}

export function nul(arg1, arg2) {
  let m = 0;
  const s1 = arg1.toString();
  const s2 = arg2.toString();
  try {
    m += s1.split(".")[1].length;
  } catch (e) {}
  try {
    m += s2.split(".")[1].length;
  } catch (e) {}
  return (Number(s1.replace(".", "")) * Number(s2.replace(".", ""))) / 10 ** m;
}

export const dateToUnix = (_date) => {
  const date = _date || new Date();
  return Math.floor(date.getTime() / 1000);
};

export function shortenAddress(address, length) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + 1;
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}

export function withChainId(path, chainId) {
  if (!chainId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}chainId=${chainId}`;
}

export const uniqBy = (arr, key) => {
  return Object.values(
    arr.reduce(
      (map, item) => ({
        ...map,
        [`${item[key]}`]: item,
      }),
      {}
    )
  );
};
