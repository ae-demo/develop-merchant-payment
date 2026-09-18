import payment_collections_api.merchantidentity;
import payment_collections_api.paymentgateway;
import ballerina/log;
import ballerina/task;
import ballerina/time;
import ballerina/uuid;

// The fixed daily settlement cadence — a background task inside this
// service, per the component contract's rule that scheduled work is never
// split into its own component. `settlementRunHourUtc`/`settlementRunMinuteUtc`
// (config.bal) are this service's own system-configuration value for the
// cadence, not a per-merchant schedule.

class SettlementJob {
    *task:Job;

    public function execute() {
        error? result = runSettlementJob();
        if result is error {
            log:printError("daily settlement run failed", 'error = result);
        }
    }
}

isolated function nextRunStart() returns time:Civil|error {
    time:Utc nowUtc = time:utcNow();
    time:Civil nowCivil = time:utcToCivil(nowUtc);
    time:Civil candidateCivil = {
        year: nowCivil.year,
        month: nowCivil.month,
        day: nowCivil.day,
        hour: settlementRunHourUtc,
        minute: settlementRunMinuteUtc,
        second: 0d,
        utcOffset: {hours: 0, minutes: 0}
    };
    time:Utc candidateUtc = check time:utcFromCivil(candidateCivil);
    if candidateUtc < nowUtc {
        candidateUtc = time:utcAddSeconds(candidateUtc, 86400);
    }
    return time:utcToCivil(candidateUtc);
}

isolated function scheduleSettlementJob() returns task:JobId|error {
    time:Civil startCivil = check nextRunStart();
    return task:scheduleJobRecurByFrequency(new SettlementJob(), 86400, startTime = startCivil);
}

isolated function logSettlementSchedulingOutcome() returns () {
    task:JobId|error jobId = scheduleSettlementJob();
    if jobId is error {
        log:printError("failed to schedule the daily settlement job", 'error = jobId);
    } else {
        log:printInfo("daily settlement job scheduled", hourUtc = settlementRunHourUtc, minuteUtc = settlementRunMinuteUtc);
    }
}

final () settlementJobScheduled = logSettlementSchedulingOutcome();

isolated function civilDateString(time:Civil civil) returns string {
    int year = civil.year;
    int month = civil.month;
    int day = civil.day;
    string monthStr = month < 10 ? "0" + month.toString() : month.toString();
    string dayStr = day < 10 ? "0" + day.toString() : day.toString();
    return year.toString() + "-" + monthStr + "-" + dayStr;
}

# For every merchant with un-settled collected transactions, aggregates
# mobile money and card together into ONE consolidated settlement (Story 8),
# gates payout on trading status held by merchant-identity-service (Story 9),
# and disburses through payment-gateway to the payout account on file there
# (Story 10) — never a value entered in this product.
isolated function runSettlementJob() returns error? {
    string[] merchantIds = check merchantIdsWithUnsettledTransactions();
    time:Utc nowUtc = time:utcNow();
    string todayDate = civilDateString(time:utcToCivil(nowUtc));
    string yesterdayDate = civilDateString(time:utcToCivil(time:utcAddSeconds(nowUtc, -86400)));
    foreach string merchantId in merchantIds {
        error? result = settleMerchant(merchantId, yesterdayDate, todayDate, todayDate);
        if result is error {
            log:printError("settlement failed for merchant", merchantId = merchantId, 'error = result);
        }
    }
}

isolated function settleMerchant(string merchantId, string periodStart, string periodEnd, string scheduledDate) returns error? {
    record {| decimal grossAmount; string currency; string[] transactionIds; |} agg =
        check unsettledCollectionsForMerchant(merchantId);
    if agg.transactionIds.length() == 0 {
        return;
    }

    decimal feeAmount = (agg.grossAmount * settlementFeePercent) / 100d;
    decimal netAmount = agg.grossAmount - feeAmount;
    string settlementId = uuid:createRandomUuid();
    string nowStr = time:utcToString(time:utcNow());

    merchantidentity:MerchantAccount account = check fetchAndCacheMerchantAccount(merchantId);

    string initialStatus = account.tradingStatus == "active" ? "scheduled" : "withheld";
    SettlementRow row = {
        id: settlementId,
        merchantId,
        periodStart,
        periodEnd,
        grossAmount: agg.grossAmount,
        feeAmount,
        netAmount,
        currency: agg.currency,
        status: initialStatus,
        scheduledDate,
        paidAt: (),
        payoutReference: ()
    };
    check insertSettlement(row, nowStr);

    // The fee is deducted, and traceable, whether the payout is made or
    // withheld: a debit against this settlement for the fee amount.
    if feeAmount > 0d {
        check insertLedgerEntry({
            id: uuid:createRandomUuid(),
            transactionId: (),
            settlementId,
            entryType: "debit",
            amount: feeAmount,
            currency: agg.currency,
            createdAt: nowStr
        }, merchantId);
    }

    check markTransactionsSettled(agg.transactionIds, settlementId);

    if account.tradingStatus != "active" {
        // Story 9: trading status is not active — withhold, do not pay.
        return;
    }

    merchantidentity:MerchantAccount_payoutAccount? payoutAccount = account?.payoutAccount;
    string? accountRef = payoutAccount?.accountRef;
    string? provider = payoutAccount?.provider;
    if accountRef is () || provider is () {
        check updateSettlementStatus(settlementId, "failed");
        return;
    }

    paymentgateway:Client gatewayClient = check paymentGatewayClient();
    paymentgateway:TransferRequest transferRequest = {
        account_bank: provider,
        account_number: accountRef,
        amount: netAmount,
        currency: toCurrency(agg.currency),
        reference: settlementId,
        narration: "Settlement payout " + settlementId
    };
    paymentgateway:inline_response_200_1|error transferResult = gatewayClient->/transfers.post(transferRequest);
    if transferResult is error {
        check updateSettlementStatus(settlementId, "failed");
        return;
    }
    paymentgateway:Transfer? transfer = transferResult?.data;
    string transferStatus = transfer?.status ?: "";
    if transferStatus == "FAILED" {
        check updateSettlementStatus(settlementId, "failed");
        return;
    }

    string payoutReference = transfer?.reference ?: settlementId;
    string paidAt = time:utcToString(time:utcNow());
    check updateSettlementPaid(settlementId, paidAt, payoutReference);

    // The payout debit: funds leaving on this settlement.
    check insertLedgerEntry({
        id: uuid:createRandomUuid(),
        transactionId: (),
        settlementId,
        entryType: "debit",
        amount: netAmount,
        currency: agg.currency,
        createdAt: paidAt
    }, merchantId);

    // Story 6: notify once a settlement is paid.
    check insertNotification({
        id: uuid:createRandomUuid(),
        settlementId,
        message: "Settlement " + settlementId + " paid: " + netAmount.toString() + " " + agg.currency,
        createdAt: paidAt,
        readAt: ()
    }, merchantId);
}
