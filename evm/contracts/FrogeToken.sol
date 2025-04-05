// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ForgeToken
 * @dev ERC20 Token with role-based minting capabilities
 */
contract ForgeToken is ERC20Pausable, AccessControl {
    // Create a new role identifier for the minter role
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    // Create a new role identifier for the pauser role
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    // Admin role is built into AccessControl
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    /**
     * @dev Constructor that sets up roles and mints initial supply
     * @param initialSupply Amount to mint to the contract deployer
     */
    constructor(uint256 initialSupply) ERC20("Forge Token", "FORGE") {
        // Grant the contract deployer the admin role: it will be able
        // to grant and revoke other roles
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // Grant the minter role to the deployer
        _grantRole(MINTER_ROLE, msg.sender);
        
        // Grant the pauser role to the deployer
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Mint initial supply to the contract deployer
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     * @return A boolean that indicates if the operation was successful
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) returns (bool) {
        _mint(to, amount);
        return true;
    }
    
    /**
     * @dev Pauses all token transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}