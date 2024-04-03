
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";


contract MBLK is ERC20, Ownable, Pausable {
    constructor(uint256 _initialSupply ) ERC20("Magical Blocks", "MBLK") {
        _mint(msg.sender, _initialSupply  );
    }

    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue) public override whenNotPaused returns (bool) {
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public override whenNotPaused returns (bool) {
        return super.decreaseAllowance(spender, subtractedValue);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}