screen Dashboard "Collections summary and next settlement at a glance"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  row
    card "Collected this period | KES 482,300 | mobile money + card"
    card "Next settlement | KES 461,200 | due tomorrow"
    card "Trading status | Active | eligible to settle"
  heading "Recent transactions"
  table "Date | Channel | Amount | Status" -> Transactions
    row "Today 14:02 | Mobile Money | KES 1,200 | Collected"
    row "Today 11:47 | Card | KES 3,400 | Collected"
  button "View all transactions" -> Transactions

screen Transactions "All collections over mobile money and card"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  row
    search "Search transactions"
    select "Channel"
    select "Status"
  table "Date | Channel | Amount | Status" -> TransactionDetail
    row "Today 14:02 | Mobile Money | KES 1,200 | Collected"
    row "Today 11:47 | Card | KES 3,400 | Collected"
    row "Yesterday 09:15 | Mobile Money | KES 850 | Failed"

screen TransactionDetail "A single collection's detail"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  breadcrumb "Transactions / Detail"
  card "Transaction"
    row
      text "Channel | Mobile Money"
      text "Amount | KES 1,200"
    row
      text "Status | Collected"
      text "Occurred at | Today 14:02"
  button "Back to transactions" -> Transactions

screen Ledger "Double-entry ledger backing the net settlement calculation"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  heading "Ledger entries"
  table "Date | Type | Amount | Reference"
    row "Today 14:02 | Credit | KES 1,200 | Transaction"
    row "Today 00:00 | Debit | KES 24 | Fee"
    row "Yesterday 00:00 | Debit | KES 461,200 | Settlement"

screen Settlements "Past and upcoming settlements"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  row
    select "Status"
    right
    text "Cadence: daily"
  table "Date | Gross | Fee | Net | Status" -> SettlementDetail
    row "Tomorrow | KES 483,500 | KES 22,300 | KES 461,200 | Scheduled"
    row "Yesterday | KES 410,000 | KES 20,500 | KES 389,500 | Paid"

screen SettlementDetail "One settlement's netting and payout"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  breadcrumb "Settlements / Detail"
  card "Settlement"
    row
      text "Gross | KES 410,000"
      text "Fee | KES 20,500"
      text "Net | KES 389,500"
    row
      text "Status | Paid"
      badge "Paid" success
    text "Payout reference | PYT-88213"
    text "Paid to account on file with merchant identity"
  button "Back to settlements" -> Settlements

screen Notifications "In-app settlement notifications"
  navbar "Merchant Portal"
  sidebar "Dashboard -> Dashboard | Transactions -> Transactions | Ledger -> Ledger | Settlements -> Settlements | Notifications -> Notifications"
  list "Settlement of KES 389,500 paid to your account | Settlement of KES 372,100 paid to your account"
  button "Mark all as read"

flow "Review collections and settlements"
  role "Merchant"
  description "A merchant checks what has been collected, how the ledger nets out, and when they are paid"
  Dashboard
  Transactions
  TransactionDetail
  Ledger
  Settlements
  SettlementDetail
  Notifications
