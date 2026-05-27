// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {BaseHook} from "v4-periphery/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {SafeCast} from "v4-core/src/libraries/SafeCast.sol";

contract TaxHook is BaseHook {
    using CurrencyLibrary for Currency;
    using SafeCast for uint256;

    uint256 public constant TAX_DENOMINATOR = 10000;
    uint256 public buyTaxRate = 500;
    uint256 public sellTaxRate = 500;
    
    address public treasuryAddress;
    mapping(address => bool) public isExcludedFromTax;
    
    mapping(PoolKey => bool) public isRegisteredPool;
    
    event TaxRatesUpdated(uint256 buyTaxRate, uint256 sellTaxRate);
    event TreasuryAddressUpdated(address newTreasury);
    event TaxExcludedUpdated(address account, bool isExcluded);
    event TaxCollected(address indexed payer, uint256 amount, bool isBuy);
    event PoolRegistered(PoolKey indexed poolKey);
    
    constructor(
        IPoolManager _poolManager,
        address _treasuryAddress
    ) BaseHook(_poolManager) {
        require(_treasuryAddress != address(0), "Invalid treasury address");
        treasuryAddress = _treasuryAddress;
        isExcludedFromTax[address(this)] = true;
        isExcludedFromTax[treasuryAddress] = true;
    }
    
    function registerPool(PoolKey calldata key) external {
        require(!isRegisteredPool[key], "Pool already registered");
        require(key.hooks == address(this), "Hook not set for this pool");
        require(
            Hooks.isValidHookAddress(address(this), Hooks.getHookPermissions(this)),
            "Invalid hook address"
        );
        
        isRegisteredPool[key] = true;
        emit PoolRegistered(key);
    }
    
    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        if (!isRegisteredPool[key]) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }
        
        bool isBuy = _isBuy(key, params);
        uint256 taxRate = isBuy ? buyTaxRate : sellTaxRate;
        
        if (taxRate > 0) {
            uint256 taxAmount = _calculateTaxAmount(params.amountSpecified, taxRate);
            
            if (taxAmount > 0) {
                address payer = msg.sender;
                if (!isExcludedFromTax[payer]) {
                    _collectTax(key, payer, taxAmount, isBuy);
                    emit TaxCollected(payer, taxAmount, isBuy);
                }
            }
        }
        
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
    
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        if (!isRegisteredPool[key]) {
            return (BaseHook.afterSwap.selector, 0);
        }
        
        bool isBuy = _isBuy(key, params);
        uint256 taxRate = isBuy ? buyTaxRate : sellTaxRate;
        
        if (taxRate > 0) {
            uint256 taxAmount = _calculateTaxAmount(params.amountSpecified, taxRate);
            
            if (taxAmount > 0) {
                address payer = msg.sender;
                if (!isExcludedFromTax[payer]) {
                    return (BaseHook.afterSwap.selector, -(taxAmount.toInt128()));
                }
            }
        }
        
        return (BaseHook.afterSwap.selector, 0);
    }
    
    function _isBuy(PoolKey calldata key, IPoolManager.SwapParams calldata params) private view returns (bool) {
        bool exactInput = params.amountSpecified < 0;
        bool zeroForOne = params.zeroForOne;
        
        if (exactInput) {
            return zeroForOne;
        } else {
            return !zeroForOne;
        }
    }
    
    function _calculateTaxAmount(int128 amountSpecified, uint256 taxRate) private pure returns (uint256) {
        uint256 absAmount = amountSpecified < 0 ? uint256(-amountSpecified) : uint256(amountSpecified);
        return (absAmount * taxRate) / TAX_DENOMINATOR;
    }
    
    function _collectTax(PoolKey calldata key, address payer, uint256 taxAmount, bool isBuy) private {
        Currency taxCurrency;
        
        if (isBuy) {
            taxCurrency = params.zeroForOne ? key.currency1 : key.currency0;
        } else {
            taxCurrency = params.zeroForOne ? key.currency0 : key.currency1;
        }
        
        poolManager.mint(address(this), taxCurrency.toId(), taxAmount);
    }
    
    function withdrawTax(Currency currency, uint256 amount) external {
        require(msg.sender == treasuryAddress, "Only treasury can withdraw");
        poolManager.burn(address(this), currency.toId(), amount);
        currency.transfer(treasuryAddress, amount);
    }
    
    function updateTaxRates(uint256 _buyTaxRate, uint256 _sellTaxRate) external {
        require(msg.sender == treasuryAddress, "Only treasury can update rates");
        require(_buyTaxRate <= 1000 && _sellTaxRate <= 1000, "Tax rate cannot exceed 10%");
        buyTaxRate = _buyTaxRate;
        sellTaxRate = _sellTaxRate;
        emit TaxRatesUpdated(_buyTaxRate, _sellTaxRate);
    }
    
    function updateTreasuryAddress(address _newTreasury) external {
        require(msg.sender == treasuryAddress, "Only treasury can update");
        require(_newTreasury != address(0), "Invalid address");
        treasuryAddress = _newTreasury;
        emit TreasuryAddressUpdated(_newTreasury);
    }
    
    function setTaxExcluded(address account, bool excluded) external {
        require(msg.sender == treasuryAddress, "Only treasury can update");
        isExcludedFromTax[account] = excluded;
        emit TaxExcludedUpdated(account, excluded);
    }
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }
}