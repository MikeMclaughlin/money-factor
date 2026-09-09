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
  tradeIn: 0,
  term: 48,
  mileage: 12000,
  selectedOffers: ["loyalty"],
  mode: "lease",
});

assert("default incentives total $4,750", shot.incentiveTotal === 4750);
assert("loyalty offer $2,000", shot.offerTotal === 2000);
assert("adjusted cap $40,880", shot.adjustedCap === 40880, "got " + shot.adjustedCap);
assert("monthly near $494.98", approx(shot.baseMonthly, 494.98, 0.1), "got " + shot.baseMonthly);
assert("taxes & fees $301.43", approx(shot.taxAndFees, 301.43, 0.05), "got " + shot.taxAndFees);
assert("due at signing displays $2,796", shot.dueAtSigningDisplay === 2796, "got " + shot.dueAtSigningDisplay);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
