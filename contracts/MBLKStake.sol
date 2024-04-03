// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
 import "@openzeppelin/contracts/access/AccessControl.sol";

contract MBLKStaked is ERC20,Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("MBLKStaked", "sMBLK") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    function pause() public onlyRole(DEFAULT_ADMIN_ROLE)  {
        _pause();
    }

    function unpause() public onlyRole(DEFAULT_ADMIN_ROLE)  {
        _unpause();
    }
   
    /**
     * @dev Burns a specific amount of tokens from the sender's balance.
     * @param amount The amount of tokens to be burned.
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burns a specific amount of tokens from the target address's balance.
     * @param account The address whose tokens will be burned.
     * @param amount The amount of tokens to be burned.
     */
    function burnFrom(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(account, amount);
    }

    /**
     * @dev Mints new tokens and assigns them to the target address.
     * @param account The address to which new tokens will be minted.
     * @param amount The amount of tokens to be minted.
     */
    function mint(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(account, amount);
    }

    /**
     * @dev Grants the minter role to a new address.
     * @param account The address to which the minter role will be granted.
     */
    function grantMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }

    /**
     * @dev Revokes the minter role from an address.
     * @param account The address from which the minter role will be revoked.
     */
    function revokeMinterRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(MINTER_ROLE, account);
    }
     function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}

 