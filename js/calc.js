/**
 * Lease money-factor math.
 * Formulas match the standard consumer lease worksheet:
 *   Depreciation = (Adjusted Cap Cost − Residual) / Term
 *   Finance charge = (Adjusted Cap Cost + Residual) × Money Factor
 *   APR ≈ Money Factor × 2400
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.LeaseCalc = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MF_TO_APR = 2400;

  function num(v, fallback) {
    var n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback == null ? 0 : fallback;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function round2(v) {
    return Math.round((v + Number.EPSILON) * 100) / 100;
  }

  function moneyFactorToApr(mf) {
    return num(mf) * MF_TO_APR;
  }

  function aprToMoneyFactor(apr) {
    return num(apr) / MF_TO_APR;
  }

  function residualDollars(msrp, residualPct, residualOverride) {
    if (residualOverride != null && residualOverride !== "" && Number.isFinite(Number(residualOverride))) {
      return num(residualOverride);
    }
    return num(msrp) * (num(residualPct) / 100);
  }

  function adjustedCapCost(opts) {
    var selling = num(opts.sellingPrice);
    var fee = num(opts.acquisitionFee);
    var reduction = num(opts.capReduction);
    return Math.max(0, selling + fee - reduction);
  }

  function lease(opts) {
    opts = opts || {};
    var term = Math.max(1, Math.round(num(opts.termMonths, 36)));
    var mf = clamp(num(opts.moneyFactor, 0), 0, 0.02);
    var taxRate = clamp(num(opts.taxRate, 0), 0, 0.2);
    var msrp = num(opts.msrp);
    var residual = residualDollars(msrp, opts.residualPct, opts.residualDollars);
    var cap = adjustedCapCost(opts);
    var depreciationTotal = cap - residual;
    var depMonthly = depreciationTotal / term;
    var financeMonthly = (cap + residual) * mf;
    var baseMonthly = depMonthly + financeMonthly;
    var taxMonthly = baseMonthly * taxRate;
    var totalMonthly = baseMonthly + taxMonthly;
    var baseMf = opts.baseMoneyFactor == null ? mf : clamp(num(opts.baseMoneyFactor), 0, 0.02);
    var baseFinanceMonthly = (cap + residual) * baseMf;
    var markupMonthly = financeMonthly - baseFinanceMonthly;

    return {
      msrp: msrp,
      sellingPrice: num(opts.sellingPrice),
      acquisitionFee: num(opts.acquisitionFee),
      capReduction: num(opts.capReduction),
      adjustedCap: cap,
      residual: residual,
      residualPctOfMsrp: msrp > 0 ? (residual / msrp) * 100 : 0,
      termMonths: term,
      moneyFactor: mf,
      apr: moneyFactorToApr(mf),
      baseMoneyFactor: baseMf,
      baseApr: moneyFactorToApr(baseMf),
      depreciationTotal: depreciationTotal,
      depreciationMonthly: depMonthly,
      financeMonthly: financeMonthly,
      baseMonthly: baseMonthly,
      taxRate: taxRate,
      taxMonthly: taxMonthly,
      totalMonthly: totalMonthly,
      totalDepreciationPaid: depMonthly * term,
      totalFinancePaid: financeMonthly * term,
      totalTaxPaid: taxMonthly * term,
      totalOfPayments: totalMonthly * term,
      dueAtSigning: num(opts.capReduction) + totalMonthly,
      markupMonthly: markupMonthly,
      markupOverTerm: markupMonthly * term,
      combinedBalance: cap + residual,
    };
  }

  function scenarioRows(baseOpts, factors) {
    return (factors || []).map(function (mf) {
      var row = lease(Object.assign({}, baseOpts, { moneyFactor: mf }));
      return {
        moneyFactor: row.moneyFactor,
        apr: row.apr,
        financeMonthly: row.financeMonthly,
        baseMonthly: row.baseMonthly,
        totalMonthly: row.totalMonthly,
        totalFinancePaid: row.totalFinancePaid,
        totalOfPayments: row.totalOfPayments,
      };
    });
  }

  function formatMoney(v, digits) {
    var n = num(v);
    var d = digits == null ? 2 : digits;
    var sign = n < 0 ? "-" : "";
    var abs = Math.abs(n);
    return (
      sign +
      "$" +
      abs.toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    );
  }

  function formatMf(v) {
    var n = num(v);
    return n.toFixed(5);
  }

  function formatPct(v, digits) {
    var d = digits == null ? 2 : digits;
    return num(v).toFixed(d) + "%";
  }

  return {
    MF_TO_APR: MF_TO_APR,
    num: num,
    clamp: clamp,
    round2: round2,
    moneyFactorToApr: moneyFactorToApr,
    aprToMoneyFactor: aprToMoneyFactor,
    residualDollars: residualDollars,
    adjustedCapCost: adjustedCapCost,
    lease: lease,
    scenarioRows: scenarioRows,
    formatMoney: formatMoney,
    formatMf: formatMf,
    formatPct: formatPct,
  };
});
