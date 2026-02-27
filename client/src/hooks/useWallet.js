import { useState, useEffect, useCallback } from "react";
import * as freighterApi from "@stellar/freighter-api";

/**
 * Custom hook for managing Freighter wallet connection
 */
export function useWallet() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState(true);
  const [checkingInstallation, setCheckingInstallation] = useState(true);

  // Check if Freighter is installed and if already connected
  useEffect(() => {
    let mounted = true;

    const checkFreighter = async () => {
      try {
        // Check if Freighter is connected/installed
        const { isConnected } = await freighterApi.isConnected();

        if (!mounted) return;

        setIsFreighterInstalled(true);
        setCheckingInstallation(false);

        // If connected, check if we're allowed and get the public key
        if (isConnected) {
          const { isAllowed } = await freighterApi.isAllowed();
          if (isAllowed) {
            const { address } = await freighterApi.getAddress();
            if (address && mounted) {
              setWalletAddress(address);
            }
          }
        }
      } catch (err) {
        if (!mounted) return;

        // If the error indicates Freighter is not installed
        if (err.message?.includes("Freighter") || err.message?.includes("extension")) {
          setIsFreighterInstalled(false);
        }
        setCheckingInstallation(false);
      }
    };

    // Small delay to let Freighter inject
    const timer = setTimeout(checkFreighter, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // First check if Freighter is available
      const { isConnected } = await freighterApi.isConnected();

      if (!isConnected) {
        setIsFreighterInstalled(false);
        throw new Error("Freighter wallet not detected. Please install from https://freighter.app");
      }

      setIsFreighterInstalled(true);

      // Request permission to access the wallet
      await freighterApi.setAllowed();

      // Get the address (public key)
      const { address } = await freighterApi.getAddress();

      if (address) {
        setWalletAddress(address);

        try {
          const { network } = await freighterApi.getNetwork();
        } catch (e) {
          // Silent fallback if network cannot be fetched
        }

        return address;
      } else {
        throw new Error("Failed to get public key. Please unlock Freighter and try again.");
      }
    } catch (err) {
      console.error("Freighter connection error:", err);

      if (err.message?.includes("User declined") || err.message?.includes("rejected")) {
        setError("Connection declined. Please approve in Freighter.");
      } else if (err.message?.includes("not detected") || err.message?.includes("not installed")) {
        setIsFreighterInstalled(false);
        setError("Freighter not installed. Please install from freighter.app");
      } else {
        setError(err.message || "Failed to connect wallet");
      }
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setError(null);
  }, []);

  // Format address for display
  const formatAddress = useCallback((address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.slice(-4)}`;
  }, []);

  return {
    walletAddress,
    isConnecting,
    isConnected: !!walletAddress,
    error,
    isFreighterInstalled,
    checkingInstallation,
    connectWallet,
    disconnectWallet,
    formatAddress,
  };
}

export default useWallet;
