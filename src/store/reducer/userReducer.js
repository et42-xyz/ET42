import { createSlice } from "@reduxjs/toolkit";

let localAccount = sessionStorage.getItem("account");

export const userSlice = createSlice({
  name: "user",
  initialState: {
    account: localAccount || "",
    userInfo: null,
  },
  reducers: {
    initAccount(state, action) {
      state.account = action.payload;
      sessionStorage.setItem("account", state.account);
    },
    updateUserInfo(state, action) {
      state.userInfo = action.payload;
    },
    signOut(state) {
      state.account = "";
      state.userInfo = null;
      sessionStorage.removeItem("account");
    },
  },
});

export const { initAccount, updateUserInfo, signOut } = userSlice.actions;
export default userSlice.reducer;
