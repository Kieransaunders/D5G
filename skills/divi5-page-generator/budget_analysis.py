import csv
from collections import defaultdict
from datetime import datetime

monzo_rows = []
with open("/Users/boss/Documents/Family Zang Finance/Monzo Data Export - CSV (Friday, 26 June 2026).csv", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        monzo_rows.append(row)

budget_rows = []
with open("/Users/boss/Documents/Family Zang Finance/Family finances Buckland house budget 2026 - budget 2026 cleaned.csv", newline="") as f:
    reader = csv.reader(f)
    for row in reader:
        budget_rows.append(row)

def parse_currency(val):
    if not val: return 0.0
    val = str(val).strip().replace(",", "")
    if val == "" or val == "-": return 0.0
    return float(val)

csv_item_map = {
    "council tax": ("Council Tax", "Housing"),
    "water": ("Water", "Housing"),
    "gas & electric": ("Gas & Electric", "Housing"),
    "virgin": ("Internet", "Bills"),
    "netflix": ("Netflix", "Entertainment"),
    "itunes music": ("Apple Services", "Entertainment"),
    "icloud storage": ("Apple Services", "Entertainment"),
    "contents insurance": ("Insurance", "Housing"),
    "buckland rent": ("Rent", "Housing"),
    "g clubs": ("G Clubs", "Kids"),
    "phev & tt insurance": ("Car Insurance", "Car"),
    "phev mot": ("Car MOT", "Car"),
    "phev tax": ("Car Tax", "Car"),
    "annual service x2": ("Car Service", "Car"),
    "aa breakdown": ("AA Breakdown", "Car"),
    "tt tax": ("Car Tax", "Car"),
    "tt . mot": ("Car MOT", "Car"),
    "gaius savings vanguard": ("Vanguard Savings", "Savings"),
    "bea savings vanguard": ("Vanguard Savings", "Savings"),
    "riverford average": ("Riverford", "Groceries"),
    "other food": ("Other Food", "Groceries"),
    "g school dinners": ("School", "Kids"),
    "b school dinners": ("School", "Kids"),
    "cats food": ("Pets", "Other"),
    "cats flea stuff & worming": ("Pets", "Other"),
    "bea clubs": ("Kids Activities", "Kids"),
    "uniform & clothes pot": ("Clothes", "Shopping"),
    "gifts (pot)": ("Gifts", "Shopping"),
    "school trips (pot)": ("School", "Kids"),
    "pocket money": ("Pocket Money", "Kids"),
    "kids mobile phones": ("Kids Mobile", "Kids"),
    "date night pot": ("Date Night", "Lifestyle"),
}

soft_budget = {
    "Supermarket": {"budget": 350.00, "group": "Groceries"},
    "Eating Out": {"budget": 150.00, "group": "Lifestyle"},
    "Fuel": {"budget": 160.00, "group": "Car"},
    "Entertainment": {"budget": 50.00, "group": "Lifestyle"},
    "Shopping": {"budget": 60.00, "group": "Shopping"},
    "General": {"budget": 30.00, "group": "Other"},
    "Personal Care": {"budget": 30.00, "group": "Other"},
    "Other Bills": {"budget": 30.00, "group": "Bills"},
    "National Trust": {"budget": 14.70, "group": "Lifestyle"},
    "Mobile": {"budget": 3.95, "group": "Bills"},
}

budget_mapping = dict(soft_budget)

for row in budget_rows:
    if len(row) < 7: continue
    item = row[1].strip().lower() if row[1] else ""
    skip_items = ("", "totals", "item", "child benefit", "rent from coop account",
                  "total needed to pay into account", "div by 2", "kieran contribution", "el contribution")
    if not item or item in skip_items: continue
    monthly_pot = parse_currency(row[4]) if len(row) > 4 else 0
    other_spend = parse_currency(row[5]) if len(row) > 5 else 0
    from_pot = row[6].strip().lower() if len(row) > 6 else ""
    amount = monthly_pot or other_spend
    if item in csv_item_map:
        cat_name, group = csv_item_map[item]
        if group == "Savings":
            if "Vanguard Savings" not in budget_mapping:
                budget_mapping["Vanguard Savings"] = {"budget": 0, "group": "Savings"}
            budget_mapping["Vanguard Savings"]["budget"] += amount
        elif from_pot == "yes":
            if cat_name not in budget_mapping or budget_mapping[cat_name].get("budget", 0) == 0:
                budget_mapping[cat_name] = {"budget": amount, "group": group, "annual": True}
            else:
                budget_mapping[cat_name]["budget"] += amount
        else:
            if cat_name not in budget_mapping:
                budget_mapping[cat_name] = {"budget": amount, "group": group}
            else:
                budget_mapping[cat_name]["budget"] += amount

txns_by_month = defaultdict(list)
for row in monzo_rows:
    try:
        dt = datetime.strptime(row["Date"], "%d/%m/%Y")
    except: continue
    month_key = dt.strftime("%Y-%m")
    txns_by_month[month_key].append({
        "date": row["Date"], "type": row["Type"], "category": row["Category"], "name": row["Name"],
        "amount": parse_currency(row["Amount"]),
        "money_out": parse_currency(row["Money Out"]),
        "money_in": parse_currency(row["Money In"]),
        "notes": (row.get("Notes and #tags", "") or "").lower(),
        "description": (row.get("Description", "") or "").lower(),
    })

def classify(txn):
    nl = txn["name"].lower()
    dl = txn.get("description", "")
    cat = txn["category"]; tt = txn["type"]
    ns = txn.get("notes", "")
    co = nl + " " + dl + " " + ns
    if tt == "Bacs (Direct Credit)": return "Income"
    if tt == "Faster payment":
        if "frome letting" in nl: return "Rent"
        if "directorloan" in (nl+dl) or "zangco" in nl: return "Roof Loan"
        if "logs" in nl: return "General"
        if "rent" in co or "coop" in co: return "Rental Income"
        if "hayes" in nl: return "Partner Contribution"
        return "General"
    if tt == "Monzo-to-Monzo" and txn["money_in"] > 0:
        if "kieran" in nl or "eleanor" in nl: return "Partner Contribution"
        return "Internal Transfer"
    if tt == "Monzo-to-Monzo" and txn["money_out"] > 0:
        if "pocket" in ns or "pocket" in nl: return "Pocket Money"
        if "bouldering" in ns or "bouldering" in nl: return "Kids Activities"
        return "Internal Transfer"
    if tt == "Pot transfer": return "Pot Transfer"
    if "newday" in nl: return "Credit Card Payment"
    if cat == "Bills":
        if "counc" in nl: return "Council Tax"
        if "wessex" in nl: return "Water"
        if "outfox" in nl: return "Gas & Electric"
        if "trinity" in nl: return "Service Charge"
        if "simply collect" in nl: return "G Clubs"
        if "netflix" in nl: return "Netflix"
        if "apple" in nl: return "Apple Services"
        if "vanguard" in nl: return "Vanguard Savings"
        if "national trust" in nl: return "National Trust"
        if "lebara" in nl: return "Mobile"
        if "leisure guard" in nl: return "Insurance"
        if "frome community" in nl: return "School"
        return "Other Bills"
    if cat == "Transfers" and tt == "Direct Debit":
        if "newday" in nl: return "Credit Card Payment"
        return "Other Bills"
    if cat == "Groceries":
        if "riverford" in nl: return "Riverford"
        if any(x in nl for x in ["lidl","asda","aldi","sainsbury","tesco","iceland"]): return "Supermarket"
        if "milk" in nl or "tytherington" in nl: return "Milk"
        return "Other Groceries"
    if cat == "Eating out": return "Eating Out"
    if cat == "Transport":
        if any(x in nl for x in ["petrol","fuel","garage","esso","bp","shell","nayax","air-serv"]): return "Fuel"
        if "parking" in nl: return "Parking"
        return "Other Transport"
    if cat == "Shopping": return "Shopping"
    if cat == "Entertainment": return "Entertainment"
    if cat == "General":
        if "barnardo" in nl: return "Charity"
        if "cheese" in nl and "grain" in nl: return "Entertainment"
        if "palette" in nl: return "Shopping"
        return "General"
    if cat == "Personal care": return "Personal Care"
    if cat == "Savings": return "Savings Transfer"
    if cat == "Income": return "Income"
    return cat

months_order = sorted(txns_by_month.keys())
month_labels = {m: datetime.strptime(m, "%Y-%m").strftime("%B %Y") for m in months_order}
monthly_spend = defaultdict(lambda: defaultdict(float))
monthly_income = defaultdict(lambda: {"child_benefit":0,"rental":0,"kieran":0,"eleanor":0,"other":0})
monthly_pot_flow = defaultdict(lambda: {"in":0.0,"out":0.0})
monthly_savings = defaultdict(float)
monthly_credit_card = defaultdict(float)
monthly_roof = defaultdict(float)

for mk in months_order:
    for txn in txns_by_month.get(mk, []):
        cls = classify(txn); amt = abs(txn["amount"])
        if cls == "Income": monthly_income[mk]["child_benefit"] += txn["money_in"]; continue
        if cls == "Rental Income": monthly_income[mk]["rental"] += txn["money_in"]; continue
        if cls == "Partner Contribution":
            if "kieran" in txn["name"].lower(): monthly_income[mk]["kieran"] += txn["money_in"]
            else: monthly_income[mk]["eleanor"] += txn["money_in"]
            continue
        if cls == "Roof Loan": monthly_roof[mk] += amt; monthly_spend[mk]["Roof Work"] += amt; continue
        if cls == "Rent": monthly_income[mk]["rental"] += txn["money_in"]; continue
        if cls == "Pot Transfer":
            if txn["amount"] > 0: monthly_pot_flow[mk]["in"] += txn["amount"]
            else: monthly_pot_flow[mk]["out"] += abs(txn["amount"])
            continue
        if cls in ("Vanguard Savings", "Savings Transfer"): monthly_savings[mk] += amt; continue
        if cls == "Credit Card Payment": monthly_credit_card[mk] += amt; monthly_spend[mk]["Credit Card Payment"] += amt; continue
        monthly_spend[mk][cls] += amt

n = len(months_order)
all_cats = set()
for m in months_order:
    for c in monthly_spend[m]: all_cats.add(c)
avg_spend = {}
for c in all_cats:
    vs = [monthly_spend[m].get(c,0) for m in months_order]
    avg_spend[c] = sum(vs)/n

groups_order = ["Housing","Groceries","Car","Kids","Lifestyle","Shopping","Entertainment","Bills","Other","Savings"]
group_budget = defaultdict(float)
group_actual = defaultdict(lambda: defaultdict(float))
for c, inf in budget_mapping.items():
    g = inf["group"]; group_budget[g] += inf["budget"]
    for m in months_order: group_actual[g][m] += monthly_spend[m].get(c,0)

def money(v): return f"£{v:,.2f}"

tpc = sum(monthly_income[m]["kieran"]+monthly_income[m]["eleanor"] for m in months_order)
tcb = sum(monthly_income[m]["child_benefit"] for m in months_order)
tr = sum(monthly_income[m]["rental"] for m in months_order)
tpi = sum(monthly_pot_flow[m]["in"] for m in months_order)
tpo = sum(monthly_pot_flow[m]["out"] for m in months_order)
tsv = sum(monthly_savings.get(m,0) for m in months_order)
tcc = sum(monthly_credit_card.get(m,0) for m in months_order)
trf = sum(monthly_roof.get(m,0) for m in months_order)
adc = [c for c in all_cats if c not in ("Credit Card Payment","Roof Work")]
dst = sum(sum(monthly_spend[m].get(c,0) for c in adc) for m in months_order)
avd = dst/n
db = sum(v["budget"] for v in budget_mapping.values())
tnp = tpo - tpi
tst = sum(sum(monthly_spend[m].get(c,0) for c in budget_mapping) for m in months_order)
tbc = sum(v["budget"] for v in budget_mapping.values()) * n
ovd = tbc - tst

print("=== BUDGET vs ACTUAL (%d months) ===" % n)
print("Months: %s" % ", ".join(month_labels[m] for m in months_order))
print("")
print("--- INCOME ---")
print("  Partner contributions: %s" % money(tpc))
print("  Child benefit: %s" % money(tcb))
print("  Rental income: %s" % money(tr))
print("")
print("--- BUDGET vs ACTUAL (avg/month) ---")
print("  %-30s %10s %10s %10s" % ("Category", "Budget", "Actual", "Diff"))
print("  " + "-"*62)
tc1 = sorted([c for c in all_cats if c in budget_mapping], key=lambda c: budget_mapping[c]["budget"], reverse=True)
tc2 = sorted([c for c in all_cats if c not in budget_mapping], key=lambda c: avg_spend[c], reverse=True)
for c in tc1 + tc2:
    inf = budget_mapping.get(c); b = inf["budget"] if inf else 0
    a = avg_spend.get(c,0); df = a - b
    if b == 0 and a < 5: continue
    an = " (a)" if inf and inf.get("annual") else ""
    print("  %-30s %10s %10s %10s" % (c+an, money(b), money(a), money(df)))
print("")
print("--- GROUP TOTALS ---")
for g in groups_order:
    b = group_budget.get(g,0)
    vs = [group_actual[g].get(m,0) for m in months_order]
    a = sum(vs)/n
    if b == 0 and a < 1: continue
    df = a - b
    print("  %-20s %10s %10s %10s" % (g, money(b), money(a), money(df)))
print("")
print("--- POTS & SAVINGS ---")
print("  Pot net saved: %s" % money(tnp))
print("  Vanguard: %s" % money(tsv))
print("  Credit card paid: %s" % money(tcc))
print("  Roof spend: %s" % money(trf))
print("")
dr = "%s - %s" % (month_labels[months_order[0]], month_labels[months_order[-1]])
print("--- OVERALL ---")
print("  Total tracked spend: %s" % money(tst))
print("  Total budget: %s" % money(tbc))
print("  You are %s %s budget" % (money(abs(ovd)), "under" if ovd > 0 else "over"))
print("")
print("Data range: %s" % dr)
print("Avg monthly spend: %s" % money(avd))
print("Monthly budget: %s" % money(db))
