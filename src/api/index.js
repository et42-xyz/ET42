import axios from "./http";

const Axios = {
  getSignMessage: (params) => axios.get("/user/getSignMessage", { params }),
  login: (data) => axios.post("/user/login", data),
  tokenList: (params) => axios.get("market/tokenList", { params }),
  tokenDetail: (params) => axios.get("/market/tokenDetail", { params }),
  orderList: (params) => axios.get("market/orderList", { params }),
  awsUpload: (data) =>
    axios.post("/aws/upload", data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  // ... ~20 more endpoints follow the same pattern (kline, history, launchpad list/detail,
  //     order balance check, support tokens, NFT launchpad, etc.)
};

export default Axios;
