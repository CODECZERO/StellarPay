package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/stellar/go/clients/horizonclient"
	"github.com/stellar/go/keypair"
	"github.com/stellar/go/network"
	"github.com/stellar/go/txnbuild"
)

// TransferRequest supports multi-asset transfers
type TransferRequest struct {
	Recipient   string `json:"recipient"`
	Amount      string `json:"amount"`
	AssetCode   string `json:"asset_code"`   // "XLM", "USDC", etc. Empty = native XLM
	AssetIssuer string `json:"asset_issuer"` // Required for non-native assets
}

// CORS middleware
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
		if allowedOrigins == "" {
			allowedOrigins = "http://localhost:5173,http://localhost:3000"
		}

		origin := r.Header.Get("Origin")
		allowOrigin := ""

		for _, o := range strings.Split(allowedOrigins, ",") {
			if strings.TrimSpace(o) == origin {
				allowOrigin = origin
				break
			}
		}

		if allowOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// apiKeyAuth middleware — protects sensitive endpoints
func apiKeyAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		apiKey := os.Getenv("API_KEY")
		if apiKey == "" {
			// No API key configured — skip auth in dev
			next(w, r)
			return
		}
		provided := r.Header.Get("X-API-Key")
		if provided != apiKey {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// sendAsset handles both XLM and custom asset transfers
func sendAsset(w http.ResponseWriter, r *http.Request) {
	// Load secret from env — never hardcode
	sourceSecret := os.Getenv("STELLAR_SOURCE_SECRET")
	if sourceSecret == "" {
		http.Error(w, "Server misconfigured: missing source secret", http.StatusInternalServerError)
		return
	}

	var req TransferRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Recipient == "" || req.Amount == "" {
		http.Error(w, "Missing recipient or amount", http.StatusBadRequest)
		return
	}

	// Determine asset type
	var asset txnbuild.Asset
	if req.AssetCode == "" || req.AssetCode == "XLM" {
		asset = txnbuild.NativeAsset{}
	} else {
		if req.AssetIssuer == "" {
			http.Error(w, "asset_issuer required for non-native assets", http.StatusBadRequest)
			return
		}
		asset = txnbuild.CreditAsset{
			Code:   req.AssetCode,
			Issuer: req.AssetIssuer,
		}
	}

	sourceKP, err := keypair.ParseFull(sourceSecret)
	if err != nil {
		http.Error(w, "Invalid source key", http.StatusInternalServerError)
		return
	}
	sourceAddress := sourceKP.Address()
	client := horizonclient.DefaultTestNetClient

	ar := horizonclient.AccountRequest{AccountID: sourceAddress}
	sourceAccount, err := client.AccountDetail(ar)
	if err != nil {
		http.Error(w, "Cannot load source account", http.StatusInternalServerError)
		return
	}

	paymentOp := txnbuild.Payment{
		Destination: req.Recipient,
		Amount:      req.Amount,
		Asset:       asset,
	}

	timeout := txnbuild.NewTimeout(300)
	txParams := txnbuild.TransactionParams{
		SourceAccount:        &sourceAccount,
		IncrementSequenceNum: true,
		BaseFee:              txnbuild.MinBaseFee,
		Operations:           []txnbuild.Operation{&paymentOp},
		Preconditions:        txnbuild.Preconditions{TimeBounds: timeout},
	}

	tx, err := txnbuild.NewTransaction(txParams)
	if err != nil {
		http.Error(w, "Transaction build failed", http.StatusInternalServerError)
		return
	}

	signedTx, err := tx.Sign(network.TestNetworkPassphrase, sourceKP)
	if err != nil {
		http.Error(w, "Signing failed", http.StatusInternalServerError)
		return
	}

	resp, err := client.SubmitTransaction(signedTx)
	if err != nil {
		http.Error(w, fmt.Sprintf("Transaction failed: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":   "Transaction successful",
		"hash":      resp.Hash,
		"asset":     req.AssetCode,
		"amount":    req.Amount,
		"recipient": req.Recipient,
	})
}

// getAccountBalances fetches all balances for an account via Horizon
func getAccountBalances(w http.ResponseWriter, r *http.Request) {
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		http.Error(w, "account_id query param required", http.StatusBadRequest)
		return
	}

	client := horizonclient.DefaultTestNetClient
	ar := horizonclient.AccountRequest{AccountID: accountID}
	account, err := client.AccountDetail(ar)
	if err != nil {
		http.Error(w, fmt.Sprintf("Cannot load account: %v", err), http.StatusInternalServerError)
		return
	}

	type Balance struct {
		AssetType   string `json:"asset_type"`
		AssetCode   string `json:"asset_code,omitempty"`
		AssetIssuer string `json:"asset_issuer,omitempty"`
		Balance     string `json:"balance"`
		Limit       string `json:"limit,omitempty"`
	}

	var balances []Balance
	for _, b := range account.Balances {
		balances = append(balances, Balance{
			AssetType:   b.Type,
			AssetCode:   b.Code,
			AssetIssuer: b.Issuer,
			Balance:     b.Balance,
			Limit:       b.Limit,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"account_id": accountID,
		"balances":   balances,
	})
}

// Health check
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"network": "testnet",
	})
}

func main() {
	// Validate required env vars on startup
	if os.Getenv("STELLAR_SOURCE_SECRET") == "" {
		log.Fatal("❌ STELLAR_SOURCE_SECRET env var is required. Set it in your .env file.")
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/send", apiKeyAuth(sendAsset))     // protected
	mux.HandleFunc("/api/balances", getAccountBalances)    // public read-only
	mux.HandleFunc("/api/health", healthCheck)

	fmt.Println("🚀 StellarPay API running at http://localhost:8080")
	fmt.Println("📡 Endpoints:")
	fmt.Println("   POST /api/send     - Send XLM or custom asset (requires X-API-Key header)")
	fmt.Println("   GET  /api/balances - Get account balances")
	fmt.Println("   GET  /api/health   - Health check")

	log.Fatal(http.ListenAndServe(":8080", enableCORS(mux)))
}