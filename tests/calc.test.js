#!/usr/bin/env node
"use strict";

var path = require("path");
var calc = require(path.join(__dirname, "..", "js", "calc.js"));

var failed = 0;
var passed = 0;

function approx(a, b, eps) {
  eps = eps == null ? 0.005 : eps;
  return Math.abs(a - b) <= eps;
}

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("  ok  " + name);
  } else {
    failed += 1;
    console.log("  FAIL  " + name + (detail ? " — " + detail : ""));
  }
}

console.log("Money factor calculator tests\n");

assert("0.00125 × 2400 = 3.0 APR", approx(calc.moneyFactorToApr(0.00125), 3));
assert("0.00100 × 2400 = 2.4 APR", approx(calc.moneyFactorToApr(0.001), 2.4));
assert("0.00200 × 2400 = 4.8 APR", approx(calc.moneyFactorToApr(0.002), 4.8));
assert("0.00250 × 2400 = 6.0 APR", approx(calc.moneyFactorToApr(0.0025), 6));
assert("0.00050 × 2400 = 1.2 APR", approx(calc.moneyFactorToApr(0.0005), 1.2));
assert("APR 3 → MF 0.00125", approx(calc.aprToMoneyFactor(3), 0.00125, 1e-9));
assert("round-trip MF → APR → MF", approx(calc.aprToMoneyFactor(calc.moneyFactorToApr(0.00175)), 0.00175, 1e-12));

var article = calc.lease({
  msrp: 40000,
  sellingPrice: 40000,
  residualDollars: 24000,
  residualPct: 60,
  termMonths: 36,
  moneyFactor: 0.001,
  taxRate: 0,
  acquisitionFee: 0,
  capReduction: 0,
  baseMoneyFactor: 0.001,
});

assert("article finance @ 0.00100 = $64", approx(article.financeMonthly, 64));
assert("article dep = (40k-24k)/36 = 444.444…", approx(article.depreciationMonthly, 16000 / 36));
assert("article base monthly = dep + 64", approx(article.baseMonthly, 16000 / 36 + 64));
assert("combined balance 64,000", approx(article.combinedBalance, 64000));

var high = calc.lease({
  msrp: 40000,
  sellingPrice: 40000,
  residualDollars: 24000,
  termMonths: 36,
  moneyFactor: 0.002,
  taxRate: 0,
});
assert("article finance @ 0.00200 = $128", approx(high.financeMonthly, 128));

var worst = calc.lease({
  msrp: 40000,
  sellingPrice: 40000,
  residualDollars: 24000,
  termMonths: 36,
  moneyFactor: 0.0025,
  taxRate: 0,
});
assert("article finance @ 0.00250 = $160", approx(worst.financeMonthly, 160));
assert("best vs worst finance delta $96", approx(worst.financeMonthly - article.financeMonthly, 96));
assert("36-mo hidden cost of that spread $3,456", approx((worst.financeMonthly - article.financeMonthly) * 36, 3456));

var markup = calc.lease({
  msrp: 40000,
  sellingPrice: 40000,
  residualDollars: 24000,
  termMonths: 36,
  moneyFactor: 0.0015,
  baseMoneyFactor: 0.001,
  taxRate: 0,
});
assert("0.00050 markup on $64k = $32/mo", approx(markup.markupMonthly, 32));
assert("markup over 36 mo = $1,152", approx(markup.markupOverTerm, 1152));

var residualFromPct = calc.residualDollars(45000, 60, null);
assert("60% of 45,000 = 27,000", approx(residualFromPct, 27000));
assert("dollar override wins", approx(calc.residualDollars(45000, 60, 22000), 22000));

var withFee = calc.lease({
  sellingPrice: 38000,
  acquisitionFee: 695,
  capReduction: 2000,
  residualDollars: 22000,
  termMonths: 36,
  moneyFactor: 0.00125,
  taxRate: 0.08,
  msrp: 40000,
});
assert("adjusted cap = 38,000 + 695 − 2,000", approx(withFee.adjustedCap, 36695));
assert("tax is 8% of base monthly", approx(withFee.taxMonthly, withFee.baseMonthly * 0.08));
assert("total monthly = base + tax", approx(withFee.totalMonthly, withFee.baseMonthly + withFee.taxMonthly));
assert("total of payments = monthly × term", approx(withFee.totalOfPayments, withFee.totalMonthly * 36));

var rows = calc.scenarioRows(
  {
    sellingPrice: 40000,
    residualDollars: 24000,
    termMonths: 36,
    taxRate: 0,
    msrp: 40000,
  },
  [0.001, 0.002]
);
assert("scenario table has 2 rows", rows.length === 2);
assert("scenario finance matches lease()", approx(rows[0].financeMonthly, 64) && approx(rows[1].financeMonthly, 128));

assert("formatMf pads to 5 decimals", calc.formatMf(0.00125) === "0.00125");
assert("formatMoney includes $", calc.formatMoney(64).indexOf("$") === 0);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
