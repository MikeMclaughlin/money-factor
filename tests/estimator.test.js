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

var shot = E.compute({
  msrp: 49630,
  sellingPrice: 49630,
  down: 2000,
  incentiveTotal: 4750,
  offerTotal: 2000,
  taxAndFees: 301.43,
  term: 48,
  mileage: 12000,
  mode: "lease",
});

assert("default incentives $4,750", shot.incentiveTotal === 4750);
assert("conditional offer $2,000", shot.offerTotal === 2000);
assert("adjusted cap $40,880", shot.adjustedCap === 40880, "got " + shot.adjustedCap);
assert("monthly near $494.98", approx(shot.baseMonthly, 494.98, 0.1), "got " + shot.baseMonthly);
assert("taxes & fees uses input $301.43", approx(shot.taxAndFees, 301.43, 0.01), "got " + shot.taxAndFees);
assert("due at signing displays $2,796", shot.dueAtSigningDisplay === 2796, "got " + shot.dueAtSigningDisplay);
assert("no trade-in on result", shot.tradeIn == null);

var moreInc = E.compute({ incentiveTotal: 6750, offerTotal: 2000, down: 2000 });
assert("raising incentives $2k cuts cap $2k", moreInc.adjustedCap === 38880, "got " + moreInc.adjustedCap);

var moreOffer = E.compute({ incentiveTotal: 4750, offerTotal: 3000, down: 2000 });
assert("raising offer $1k cuts cap $1k", moreOffer.adjustedCap === 39880);

var taxOverride = E.compute({ taxAndFees: 500 });
assert("tax input overrides formula", taxOverride.taxAndFees === 500);
assert(
  "due at signing uses tax input",
  approx(taxOverride.dueAtSigning, taxOverride.down + 500 + taxOverride.baseMonthly, 0.02)
);

var finance = E.compute({ mode: "finance", incentiveTotal: 1000, offerTotal: 2000, down: 2000 });
assert("finance amount = MSRP − incentives − offer − down", finance.amountFinanced === 44630);

var cash = E.compute({ mode: "cash", incentiveTotal: 1000, offerTotal: 2000, down: 2000 });
assert("cash price ignores down", cash.cashPrice === 46630);

var baseMf = E.compute({ moneyFactor: 0.00125 });
var highMf = E.compute({ moneyFactor: 0.00250 });
assert("default MF 0.00125 is 3% APR", approx(baseMf.apr, 3, 0.01), "got " + baseMf.apr);
assert("0.00250 MF is 6% APR", approx(highMf.apr, 6, 0.01), "got " + highMf.apr);
assert("higher MF raises monthly payment", highMf.baseMonthly > baseMf.baseMonthly);
assert(
  "rent charge uses cap + residual",
  approx(highMf.rentMonthly - baseMf.rentMonthly, (baseMf.adjustedCap + baseMf.residual) * 0.00125, 0.02)
);
assert("due at signing rises with MF", highMf.dueAtSigning > baseMf.dueAtSigning);

var fromApr = E.compute({ moneyFactor: 3 });
assert("APR 3 converts to MF 0.00125", approx(fromApr.moneyFactor, 0.00125, 1e-6), "got " + fromApr.moneyFactor);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
