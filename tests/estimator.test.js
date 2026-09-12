#!/usr/bin/env node
"use strict";

var path = require("path");
var E = require(path.join(__dirname, "..", "js", "estimator.js"));

var failed = 0;
var passed = 0;

function approx(a, b, eps) {
  eps = eps == null ? 0.02 : eps;
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

console.log("Payment estimator tests\n");

var defaults = E.compute({});
assert("default down is $0", defaults.down === 0);
assert("default cap is $42,880", defaults.adjustedCap === 42880, "got " + defaults.adjustedCap);
assert("default money factor is 0.001", approx(defaults.moneyFactor, 0.001, 1e-9), "got " + defaults.moneyFactor);
assert("default MF is 2.4% APR", approx(defaults.apr, 2.4, 0.01), "got " + defaults.apr);
assert("default tax rate is 6.3%", approx(defaults.taxRate, 0.063, 1e-9), "got " + defaults.taxRate);
assert(
  "tax = cap × 6.3%",
  approx(defaults.tax, 42880 * 0.063, 0.02),
  "got " + defaults.tax + " expected " + 42880 * 0.063
);
assert("fees are separate from tax", defaults.fees === 80, "got " + defaults.fees);
assert("tax + fees = taxAndFees", approx(defaults.taxAndFees, defaults.tax + defaults.fees, 0.02));
assert(
  "due at signing = down + tax + fees + first month",
  approx(defaults.dueAtSigning, defaults.down + defaults.tax + defaults.fees + defaults.baseMonthly, 0.02)
);

var pctInput = E.compute({ taxRate: 6.3 });
assert("tax rate 6.3 is treated as 6.3%", approx(pctInput.taxRate, 0.063, 1e-9));
assert("same tax whether 0.063 or 6.3 entered", approx(pctInput.tax, defaults.tax, 0.02));

var shot = E.compute({
  msrp: 49630,
  sellingPrice: 49630,
  down: 0,
  incentiveTotal: 4750,
  offerTotal: 2000,
  fees: 80,
  taxRate: 0.063,
  term: 48,
  mileage: 12000,
  mode: "lease",
});
assert("default incentives $4,750", shot.incentiveTotal === 4750);
assert("conditional offer $2,000", shot.offerTotal === 2000);
assert("adjusted cap $42,880", shot.adjustedCap === 42880, "got " + shot.adjustedCap);

var moreInc = E.compute({ incentiveTotal: 6750, offerTotal: 2000, down: 0 });
assert("raising incentives $2k cuts cap $2k", moreInc.adjustedCap === 40880, "got " + moreInc.adjustedCap);
assert("lower cap lowers tax", moreInc.tax < defaults.tax);

var finance = E.compute({ mode: "finance", incentiveTotal: 1000, offerTotal: 2000, down: 0 });
assert("finance amount = MSRP − incentives − offer − down", finance.amountFinanced === 46630);

var highMf = E.compute({ moneyFactor: 0.002 });
assert("0.002 MF is 4.8% APR", approx(highMf.apr, 4.8, 0.01), "got " + highMf.apr);
assert("higher MF raises monthly payment", highMf.baseMonthly > defaults.baseMonthly);
assert(
  "rent charge uses cap + residual",
  approx(highMf.rentMonthly - defaults.rentMonthly, (defaults.adjustedCap + defaults.residual) * 0.001, 0.02)
);

var fromApr = E.compute({ moneyFactor: 2.4 });
assert("APR 2.4 converts to MF 0.001", approx(fromApr.moneyFactor, 0.001, 1e-6), "got " + fromApr.moneyFactor);

var milesHi = E.compute({ mileage: 15000 });
var milesLo = E.compute({ mileage: 7500 });
assert("higher mileage lowers residual", milesHi.residual < milesLo.residual);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
