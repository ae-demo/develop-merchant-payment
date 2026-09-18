// Generated from specs/design/components/payment-collections-api/openapi.yaml
// by `bal openapi --mode service`, then filled in by hand: every resource
// resolves its rows through the gateway-signed assertion's caller id against
// this service's own ledger-db tables, per `api-management` and
// `thunder-authentication`. The gateway has already enforced each
// operation's scope from the contract; this service holds no
// operation->scope table.

import ballerina/http;
import ballerina/time;

listener http:Listener ep0 = new (9090);

service http:InterceptableService / on ep0 {
    public function createInterceptors() returns AssertionInterceptor => new;

    # The caller's double-entry ledger
    resource function get me/ledger\-entries(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns inline_response_200_1|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        string merchantId = caller.userId;
        int count = check countLedgerEntriesByMerchant(merchantId);
        LedgerEntryRow[] rows = check listLedgerEntriesByMerchant(merchantId, 'limit, offset);
        LedgerEntry[] data = from LedgerEntryRow row in rows select ledgerEntryFromRow(row);
        [string?, string?] links = pageLinks("/me/ledger-entries", {}, offset, 'limit, count);
        return {count, next: links[0], previous: links[1], data};
    }

    # The caller's in-app notifications
    #
    # + return - returns can be any of following types
    # http:Ok (Matching notifications)
    # http:Unauthorized (Not signed in)
    resource function get me/notifications(http:RequestContext ctx, int 'limit = 20, int offset = 0)
            returns inline_response_200_3|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        string merchantId = caller.userId;
        int count = check countNotificationsByMerchant(merchantId);
        NotificationRow[] rows = check listNotificationsByMerchant(merchantId, 'limit, offset);
        Notification[] data = from NotificationRow row in rows select notificationFromRow(row);
        [string?, string?] links = pageLinks("/me/notifications", {}, offset, 'limit, count);
        return {count, next: links[0], previous: links[1], data};
    }

    # The caller's settlements, past and upcoming
    #
    # + return - returns can be any of following types
    # http:Ok (Matching settlements)
    # http:Unauthorized (Not signed in)
    resource function get me/settlements(http:RequestContext ctx, "scheduled"|"withheld"|"paid"|"failed"? status,
            int 'limit = 20, int offset = 0) returns inline_response_200_2|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        string merchantId = caller.userId;
        int count = check countSettlementsByMerchant(merchantId, status);
        SettlementRow[] rows = check listSettlementsByMerchant(merchantId, 'limit, offset, status);
        Settlement[] data = from SettlementRow row in rows select settlementFromRow(row);
        map<string> fixed = {};
        if status is string {
            fixed["status"] = status;
        }
        [string?, string?] links = pageLinks("/me/settlements", fixed, offset, 'limit, count);
        return {count, next: links[0], previous: links[1], data};
    }

    # The caller's settlement detail
    #
    # + return - returns can be any of following types
    # http:Ok (The settlement)
    # http:NotFound (No such settlement for the caller)
    # http:Unauthorized (Not signed in)
    resource function get me/settlements/[string settlementId](http:RequestContext ctx)
            returns Settlement|ErrorNotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        SettlementRow? row = check getSettlementByIdForMerchant(settlementId, caller.userId);
        if row is () {
            return <ErrorNotFound>{body: {code: 404, message: "no such settlement for the caller"}};
        }
        return settlementFromRow(row);
    }

    # The caller's collected transactions
    #
    # + return - returns can be any of following types
    # http:Ok (Matching transactions)
    # http:Unauthorized (Not signed in)
    resource function get me/transactions(http:RequestContext ctx, "mobile_money"|"card"? channel,
            "collected"|"failed"|"reversed"? status, int 'limit = 20, int offset = 0)
            returns inline_response_200|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        string merchantId = caller.userId;
        int count = check countTransactionsByMerchant(merchantId, channel, status);
        TransactionRow[] rows = check listTransactionsByMerchant(merchantId, 'limit, offset, channel, status);
        Transaction[] data = from TransactionRow row in rows select transactionFromRow(row);
        map<string> fixed = {};
        if channel is string {
            fixed["channel"] = channel;
        }
        if status is string {
            fixed["status"] = status;
        }
        [string?, string?] links = pageLinks("/me/transactions", fixed, offset, 'limit, count);
        return {count, next: links[0], previous: links[1], data};
    }

    # The caller's transaction detail
    #
    # + return - returns can be any of following types
    # http:Ok (The transaction)
    # http:NotFound (No such transaction for the caller)
    # http:Unauthorized (Not signed in)
    resource function get me/transactions/[string transactionId](http:RequestContext ctx)
            returns Transaction|ErrorNotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        TransactionRow? row = check getTransactionByIdForMerchant(transactionId, caller.userId);
        if row is () {
            return <ErrorNotFound>{body: {code: 404, message: "no such transaction for the caller"}};
        }
        return transactionFromRow(row);
    }

    # Mark the caller's own notification as read
    #
    # + return - returns can be any of following types
    # http:Ok (Notification acknowledged)
    # http:NotFound (No such notification for the caller)
    # http:Unauthorized (Not signed in)
    resource function post me/notifications/[string notificationId]/acknowledge(http:RequestContext ctx)
            returns Notification|ErrorNotFound|http:Unauthorized|error {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        string nowStr = time:utcToString(time:utcNow());
        NotificationRow? row = check acknowledgeNotificationForMerchant(notificationId, caller.userId, nowStr);
        if row is () {
            return <ErrorNotFound>{body: {code: 404, message: "no such notification for the caller"}};
        }
        return notificationFromRow(row);
    }
}

public type Settlement record {
    string id;
    string periodStart;
    string periodEnd;
    decimal grossAmount;
    decimal feeAmount;
    decimal netAmount;
    "KES"|"NGN" currency;
    "scheduled"|"withheld"|"paid"|"failed" status;
    string scheduledDate;
    string? paidAt?;
    string? payoutReference?;
};

public type ErrorNotFound record {|
    *http:NotFound;
    Error body;
|};

public type Transaction record {
    string id;
    "mobile_money"|"card" channel;
    decimal amount;
    "KES"|"NGN" currency;
    "collected"|"failed"|"reversed" status;
    string occurredAt;
};

public type NotificationOk record {|
    *http:Ok;
    Notification body;
|};

public type LedgerEntry record {
    string id;
    string? transactionId?;
    string? settlementId?;
    "debit"|"credit" entryType;
    decimal amount;
    "KES"|"NGN" currency;
    string createdAt;
};

public type inline_response_200_1 record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    LedgerEntry[] data;
};

public type inline_response_200 record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Transaction[] data;
};

public type Error record {
    # HTTP or application error code
    int code;
    # short human-readable label
    string message;
    # detailed explanation
    string description?;
    # URI to documentation
    string moreInfo?;
};

public type inline_response_200_2 record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Settlement[] data;
};

public type inline_response_200_3 record {
    # total matching items
    int count;
    # relative URI of the next page
    string? next?;
    # relative URI of the previous page
    string? previous?;
    Notification[] data;
};

public type Notification record {
    string id;
    string? settlementId?;
    string message;
    string createdAt;
    string? readAt?;
};

public type ErrorUnauthorized record {|
    *http:Unauthorized;
    Error body;
|};
