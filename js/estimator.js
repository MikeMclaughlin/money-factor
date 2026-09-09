/**
 * Dealer-style payment estimator math.
 * Adjusted cap = selling − incentives − conditional − down − trade-in
 * Monthly (no tax) = depreciation + rent charge
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Estimator = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TERMS = [48, 42, 39, 36, 27, 24];
  var MILEAGES = [7500, 10000, 12000, 15000];

  var DEFAULTS = {
    msrp: 49630,
    sellingPrice: 49630,
    down: 2000,
    tradeIn: 0,
    term: 48,
    mileage: 12000,
    taxRate: 0.08875,
    docFee: 80,
    moneyFactor: 0.00125,
    mode: "lease",
    financeApr: 0.0599,
    financeTerm: 60,
  };

  var INCENTIVES = [
    { id: "ne-2250", label: "Northeast BC Regional Lease Bonus Cash", amount: 2250, modes: ["lease"] },
    { id: "ne-1500", label: "Northeast BC Regional Lease Bonus Cash", amount: 1500, modes: ["lease"] },
    { id: "nat-1000", label: "National Bonus Cash", amount: 1000, modes: ["lease", "finance", "cash"] },
  ];

  var OFFERS = [
    { id: "military", group: "Military", label: "National 2026 Military Bonus Cash", amount: 500 },
    { id: "driveability", group: "National 2026 DriveAbility", label: "National 2026 DriveAbility", amount: 1000 },
    { id: "loyalty", group: "Lease Loyalty", label: "National SFS Lease Loyalty Bonus Cash", amount: 2000 },
    { id: "first-responder", group: "First Responders", label: "National 2026 First Responder Bonus Cash", amount: 500 },
  ];

  var RESIDUAL_AT_10K = {
    24: 58.2,
    27: 55.4,
    36: 50.1,
    39: 47.6,
    42: 44.8,
    48: 42.88,
  };

  function num(v, fallback) {
    var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : fallback == null ? 0 : fallback;
  }

  function round2(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  function round0(v) {
    return Math.round(v);
  }

  function residualPct(term, mileage) {
    var base = RESIDUAL_AT_10K[term];
    if (base == null) {
      var keys = Object.keys(RESIDUAL_AT_10K).map(Number).sort(function (a, b) {
        return a - b;
      });
      var nearest = keys[0];
      var best = Math.abs(term - nearest);
      keys.forEach(function (k) {
        var d = Math.abs(term - k);
        if (d < best) {
          best = d;
          nearest = k;
        }
      });
      base = RESIDUAL_AT_10K[nearest];
    }
    var miles = num(mileage, 10000);
    var delta = ((10000 - miles) / 2500) * 1.15;
    return Math.max(28, Math.min(72, base + delta));
  }

  function moneyFactorFor(term, mode) {
    if (mode !== "lease") return 0;
    if (term <= 36) return 0.00099;
    if (term <= 42) return 0.00115;
    return 0.00125;
  }

  function sumAmounts(items) {
    return items.reduce(function (s, it) {
      return s + num(it.amount);
    }, 0);
  }

  function incentivesFor(mode) {
    return INCENTIVES.filter(function (row) {
      return row.modes.indexOf(mode) !== -1;
    });
  }

  function compute(state) {
    state = Object.assign({}, DEFAULTS, state || {});
    var mode = state.mode || "lease";
    var msrp = Math.max(0, num(state.msrp, DEFAULTS.msrp));
    var selling = Math.max(0, num(state.sellingPrice, msrp));
    var down = Math.max(0, num(state.down, DEFAULTS.down));
    var tradeIn = Math.max(0, num(state.tradeIn, DEFAULTS.tradeIn));
    var term = Math.round(num(state.term, DEFAULTS.term));
    var mileage = Math.round(num(state.mileage, DEFAULTS.mileage));
    var selectedOffers = Array.isArray(state.selectedOffers) ? state.selectedOffers : ["loyalty"];
    var taxRate = num(state.taxRate, DEFAULTS.taxRate);
    var docFee = num(state.docFee, DEFAULTS.docFee);

    var activeIncentives = incentivesFor(mode);
    var incentiveTotal = sumAmounts(activeIncentives);

    var activeOffers = OFFERS.filter(function (o) {
      return selectedOffers.indexOf(o.id) !== -1;
    });
    var offerTotal = sumAmounts(activeOffers);

    var reduction = incentiveTotal + offerTotal + down + tradeIn;
    var adjustedCap = Math.max(0, selling - reduction);
    var downPct = msrp > 0 ? (down / msrp) * 100 : 0;

    var resPct = residualPct(term, mileage);
    var residual = round2(msrp * (resPct / 100));
    var mf = num(state.moneyFactor, moneyFactorFor(term, mode));

    var depMonthly = term > 0 ? (adjustedCap - residual) / term : 0;
    var rentMonthly = (adjustedCap + residual) * mf;
    var baseMonthly = round2(Math.max(0, depMonthly + rentMonthly));

    var taxAndFees = round2((down + baseMonthly) * taxRate + docFee);
    var dueAtSigning = round2(down + taxAndFees + baseMonthly);

    var financeTerm = Math.max(1, Math.round(num(state.financeTerm, DEFAULTS.financeTerm)));
    var financeApr = num(state.financeApr, DEFAULTS.financeApr);
    var amountFinanced = Math.max(0, selling - incentiveTotal - offerTotal - down - tradeIn);
    var monthlyRate = financeApr / 12;
    var financeMonthly =
      monthlyRate === 0
        ? amountFinanced / financeTerm
        : (amountFinanced * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -financeTerm));
    financeMonthly = round2(financeMonthly);

    var cashPrice = Math.max(0, selling - incentiveTotal - offerTotal - tradeIn);

    return {
      mode: mode,
      msrp: msrp,
      sellingPrice: selling,
      down: down,
      downPct: downPct,
      tradeIn: tradeIn,
      term: term,
      mileage: mileage,
      incentives: activeIncentives,
      incentiveTotal: incentiveTotal,
      offers: OFFERS,
      activeOffers: activeOffers,
      offerTotal: offerTotal,
      adjustedCap: round2(adjustedCap),
      residual: residual,
      residualPct: resPct,
      moneyFactor: mf,
      apr: mf * 2400,
      depreciationMonthly: depMonthly,
      rentMonthly: rentMonthly,
      baseMonthly: baseMonthly,
      taxRate: taxRate,
      taxAndFees: taxAndFees,
      dueAtSigning: dueAtSigning,
      dueAtSigningDisplay: round0(dueAtSigning),
      financeTerm: financeTerm,
      financeApr: financeApr,
      amountFinanced: round2(amountFinanced),
      financeMonthly: financeMonthly,
      cashPrice: round2(cashPrice),
    };
  }

  function formatMoney(v, digits) {
    var n = num(v);
    var d = digits == null ? 2 : digits;
    var sign = n < 0 ? "-" : "";
    return (
      sign +
      "$" +
      Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    );
  }

  function formatMoneySmart(v) {
    var n = num(v);
    var isInt = Math.abs(n - Math.round(n)) < 0.005;
    return formatMoney(n, isInt ? 0 : 2);
  }

  return {
    TERMS: TERMS,
    MILEAGES: MILEAGES,
    DEFAULTS: DEFAULTS,
    INCENTIVES: INCENTIVES,
    OFFERS: OFFERS,
    num: num,
    round2: round2,
    residualPct: residualPct,
    moneyFactorFor: moneyFactorFor,
    compute: compute,
    formatMoney: formatMoney,
    formatMoneySmart: formatMoneySmart,
  };
});
