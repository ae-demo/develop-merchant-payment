import payment_collections_api.merchantidentity;
import payment_collections_api.paymentgateway;

// Both external clients are constructed lazily, on first use, exactly like
// the ledger-db client: their secrets (FLUTTERWAVE_SECRET_KEY,
// MERCHANT_IDENTITY_API_KEY) may be unset in this environment, and this
// service must still start cleanly. A call made without a real credential
// fails at that call, not at startup. Each lazily-built client lives inside
// its own isolated holder class — a plain module-level mutable global cannot
// be `lock`-protected from a top-level isolated function.

isolated class PaymentGatewayHolder {
    private paymentgateway:Client? clientValue = ();

    isolated function get() returns paymentgateway:Client? {
        lock {
            return self.clientValue;
        }
    }

    isolated function set(paymentgateway:Client c) {
        lock {
            self.clientValue = c;
        }
    }
}

isolated class MerchantIdentityHolder {
    private merchantidentity:Client? clientValue = ();

    isolated function get() returns merchantidentity:Client? {
        lock {
            return self.clientValue;
        }
    }

    isolated function set(merchantidentity:Client c) {
        lock {
            self.clientValue = c;
        }
    }
}

final PaymentGatewayHolder paymentGatewayHolder = new;
final MerchantIdentityHolder merchantIdentityHolder = new;

isolated function paymentGatewayClient() returns paymentgateway:Client|error {
    paymentgateway:Client? existing = paymentGatewayHolder.get();
    if existing is paymentgateway:Client {
        return existing;
    }
    paymentgateway:Client newClient = check new ({auth: {token: flutterwaveSecretKey}}, flutterwaveBaseUrl);
    paymentGatewayHolder.set(newClient);
    return newClient;
}

isolated function merchantIdentityClient() returns merchantidentity:Client|error {
    merchantidentity:Client? existing = merchantIdentityHolder.get();
    if existing is merchantidentity:Client {
        return existing;
    }
    merchantidentity:Client newClient = check new ({X\-Api\-Key: merchantIdentityApiKey}, merchantIdentityBaseUrl);
    merchantIdentityHolder.set(newClient);
    return newClient;
}
