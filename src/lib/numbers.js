import { BigNumber, BigNumberish, ethers } from "ethers";
import { ceil, floor, round } from "lodash";
window.ethers = ethers;

export function formatNumber(num) {
  if (isNaN(num)) return num;
  if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else {
    return (num / 1000000000).toFixed(1) + "B";
  }

  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1) + "K";
  } else if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else {
    return (num / 1000000000).toFixed(1) + "B";
  }
}

export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export const limitDecimalsWithNormal = (amount, maxDecimals) => {
  let temAmount = amount === 0 ? "0.000" : amount;
  let amountStr = temAmount.toString();
  if (maxDecimals === undefined) {
    return amountStr;
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0];
  }
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals));
    } else {
      amountStr = amountStr + "0".repeat(maxDecimals - decimals);
    }
  }
  return amountStr;
};

export const trimTrailingZeros = (numStr) => {
  if (!numStr || !numStr.replace) return numStr;
  return numStr.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0*$/, "");
};

export const limitDecimals = (amount, maxDecimals, computedType = "normal") => {
  let res = 0;
  if (computedType === "normal") {
    res = limitDecimalsWithNormal(amount, maxDecimals);
  } else if (computedType === "round") {
    res = round(amount, maxDecimals);
  } else if (computedType === "floor") {
    res = floor(amount, maxDecimals);
  } else {
    res = ceil(amount, maxDecimals);
  }
  return trimTrailingZeros(res);
};

export function numberWithCommas(x) {
  if (!x && x != 0) {
    return "...";
  }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}
