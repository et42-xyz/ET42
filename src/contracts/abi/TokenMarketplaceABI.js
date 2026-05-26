const abi = [
  {
    inputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "unitPrice", type: "uint256" },
    ],
    name: "createSellOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "orderId", type: "uint256" },
      { internalType: "uint256", name: "amountToBuy", type: "uint256" },
    ],
    name: "acceptSellOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "orderId", type: "uint256" }],
    name: "cancelSellOrder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ... full ABI omitted for brevity (~40 entries: createBuyOrder, acceptBuyOrder,
  //     batchAcceptSellOrders, batchAcceptBuyOrders, cancelBuyOrder, feePercent,
  //     listToken, delistToken, tokenListed, get*OrdersCount, events, errors, etc.)
];

export default abi;
