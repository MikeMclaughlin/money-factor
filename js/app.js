(function () {
  "use strict";

  var C = window.LeaseCalc;
  var DEFAULTS = {
    msrp: 42000,
    sellingPrice: 40000,
    acquisitionFee: 695,
    capReduction: 0,
    residualPct: 60,
    termMonths: 36,
    moneyFactor: 0.00125,
    baseMoneyFactor: 0.001,
    taxRatePct: 0,
  };

  var SCENARIO_MFS = [0.0005, 0.001, 0.00125, 0.0015, 0.002, 0.0025];

  var els = {};
  var sortState = { key: "moneyFactor", dir: 1 };

  function $(id) {
    return document.getElementById(id);
  }

  function bind() {
    [
      "msrp",
      "sellingPrice",
      "acquisitionFee",
      "capReduction",
      "residualPct",
      "termMonths",
      "moneyFactor",
      "apr",
      "baseMoneyFactor",
      "taxRatePct",
    ].forEach(function (id) {
      els[id] = $(id);
    });
    els.reset = $("reset");
    els.results = $("results");
    els.tableBody = $("scenario-body");
    els.table = $("scenario-table");
  }

  function read() {
    return {
      msrp: C.num(els.msrp.value, DEFAULTS.msrp),
      sellingPrice: C.num(els.sellingPrice.value, DEFAULTS.sellingPrice),
      acquisitionFee: C.num(els.acquisitionFee.value, DEFAULTS.acquisitionFee),
      capReduction: C.num(els.capReduction.value, DEFAULTS.capReduction),
      residualPct: C.num(els.residualPct.value, DEFAULTS.residualPct),
      residualDollars: null,
      termMonths: C.num(els.termMonths.value, DEFAULTS.termMonths),
      moneyFactor: C.num(els.moneyFactor.value, DEFAULTS.moneyFactor),
      baseMoneyFactor: C.num(els.baseMoneyFactor.value, DEFAULTS.baseMoneyFactor),
      taxRate: C.num(els.taxRatePct.value, DEFAULTS.taxRatePct) / 100,
    };
  }

  function setReadout(id, text) {
    var node = document.querySelector('[data-for="' + id + '"]');
    if (node) node.textContent = text;
  }

  function syncReadouts(opts) {
    setReadout("msrp", C.formatMoney(opts.msrp, 0));
    setReadout("sellingPrice", C.formatMoney(opts.sellingPrice, 0));
    setReadout("acquisitionFee", C.formatMoney(opts.acquisitionFee, 0));
    setReadout("capReduction", C.formatMoney(opts.capReduction, 0));
    setReadout("residualPct", C.formatPct(opts.residualPct, 0));
    setReadout("termMonths", opts.termMonths + " mo");
    setReadout("moneyFactor", C.formatMf(opts.moneyFactor));
    setReadout("apr", C.formatPct(C.moneyFactorToApr(opts.moneyFactor), 2));
    setReadout("baseMoneyFactor", C.formatMf(opts.baseMoneyFactor));
    setReadout("taxRatePct", C.formatPct(opts.taxRate * 100, 1));
  }

  function renderResults(r) {
    var depShare = Math.max(0, r.baseMonthly) || 1;
    var totalBar = Math.max(r.totalMonthly, 0.01);
    var depPct = (Math.max(0, r.depreciationMonthly) / totalBar) * 100;
    var finPct = (Math.max(0, r.financeMonthly) / totalBar) * 100;
    var taxPct = (Math.max(0, r.taxMonthly) / totalBar) * 100;

    var markupHtml = "";
    if (Math.abs(r.markupMonthly) < 0.005) {
      markupHtml =
        '<div class="markup-callout good">Quoted money factor matches the base rate. No dealer markup in this model.</div>';
    } else if (r.markupMonthly > 0) {
      markupHtml =
        '<div class="markup-callout">Dealer markup of <strong>' +
        C.formatMf(r.moneyFactor - r.baseMoneyFactor) +
        "</strong> adds <strong>" +
        C.formatMoney(r.markupMonthly) +
        "</strong> / month, or <strong>" +
        C.formatMoney(r.markupOverTerm) +
        "</strong> over " +
        r.termMonths +
        " months.</div>";
    } else {
      markupHtml =
        '<div class="markup-callout good">Quoted factor is below the base you entered by <strong>' +
        C.formatMoney(Math.abs(r.markupMonthly)) +
        "</strong> / month.</div>";
    }

    els.results.innerHTML =
      '<div class="big-pay">' +
      '<div><div class="amt">' +
      C.formatMoney(r.totalMonthly) +
      '</div><div class="sub">est. monthly' +
      (r.taxRate ? " incl. tax" : " before tax") +
      "</div></div>" +
      '<div class="sub">APR ' +
      C.formatPct(r.apr, 2) +
      " · MF " +
      C.formatMf(r.moneyFactor) +
      "</div></div>" +
      '<div class="bars" aria-hidden="true">' +
      '<span class="dep" style="width:' +
      depPct.toFixed(2) +
      '%"></span>' +
      '<span class="fin" style="width:' +
      finPct.toFixed(2) +
      '%"></span>' +
      '<span class="tax" style="width:' +
      taxPct.toFixed(2) +
      '%"></span></div>' +
      '<div class="legend"><span><i class="dep"></i>Depreciation ' +
      C.formatMoney(r.depreciationMonthly) +
      "</span><span><i class="fin"></i>Finance " +
      C.formatMoney(r.financeMonthly) +
      "</span><span><i class="tax"></i>Tax " +
      C.formatMoney(r.taxMonthly) +
      "</span></div>" +
      '<div class="stat-grid">' +
      stat("Adjusted cap cost", C.formatMoney(r.adjustedCap)) +
      stat("Residual", C.formatMoney(r.residual) + " (" + C.formatPct(r.residualPctOfMsrp, 1) + ")") +
      stat("Depreciation total", C.formatMoney(r.depreciationTotal)) +
      stat("Finance over term", C.formatMoney(r.totalFinancePaid)) +
      stat("Payments over term", C.formatMoney(r.totalOfPayments)) +
      stat("Cap + residual", C.formatMoney(r.combinedBalance)) +
      "</div>" +
      markupHtml;
  }

  function stat(lbl, val) {
    return '<div class="stat"><span class="lbl">' + lbl + '</span><span class="val">' + val + "</span></div>";
  }

  function renderTable(opts) {
    var rows = C.scenarioRows(opts, SCENARIO_MFS).map(function (row) {
      row._active = Math.abs(row.moneyFactor - opts.moneyFactor) < 1e-6;
      return row;
    });
    var key = sortState.key;
    var dir = sortState.dir;
    rows.sort(function (a, b) {
      var av = a[key];
      var bv = b[key];
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    els.tableBody.innerHTML = rows
      .map(function (row) {
        return (
          "<tr class='" +
          (row._active ? "active" : "") +
          "'>" +
          "<td>" +
          C.formatMf(row.moneyFactor) +
          "</td>" +
          "<td>" +
          C.formatPct(row.apr, 1) +
          "</td>" +
          "<td>" +
          C.formatMoney(row.financeMonthly) +
          "</td>" +
          "<td>" +
          C.formatMoney(row.baseMonthly) +
          "</td>" +
          "<td>" +
          C.formatMoney(row.totalFinancePaid) +
          "</td>" +
          "<td>" +
          C.formatMoney(row.totalOfPayments) +
          "</td></tr>"
        );
      })
      .join("");

    Array.prototype.forEach.call(els.table.querySelectorAll("th[data-key]"), function (th) {
      var k = th.getAttribute("data-key");
      if (k === sortState.key) th.setAttribute("aria-sort", sortState.dir === 1 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    });
  }

  function update(from) {
    var opts = read();
    if (from === "apr") {
      opts.moneyFactor = C.aprToMoneyFactor(C.num(els.apr.value));
      els.moneyFactor.value = opts.moneyFactor.toFixed(5);
    } else {
      els.apr.value = C.moneyFactorToApr(opts.moneyFactor).toFixed(2);
    }
    opts = read();
    syncReadouts(opts);
    var result = C.lease(opts);
    renderResults(result);
    renderTable(opts);
  }

  function applyDefaults() {
    els.msrp.value = DEFAULTS.msrp;
    els.sellingPrice.value = DEFAULTS.sellingPrice;
    els.acquisitionFee.value = DEFAULTS.acquisitionFee;
    els.capReduction.value = DEFAULTS.capReduction;
    els.residualPct.value = DEFAULTS.residualPct;
    els.termMonths.value = DEFAULTS.termMonths;
    els.moneyFactor.value = DEFAULTS.moneyFactor.toFixed(5);
    els.apr.value = C.moneyFactorToApr(DEFAULTS.moneyFactor).toFixed(2);
    els.baseMoneyFactor.value = DEFAULTS.baseMoneyFactor.toFixed(5);
    els.taxRatePct.value = DEFAULTS.taxRatePct;
  }

  function init() {
    bind();
    applyDefaults();
    ["msrp", "sellingPrice", "acquisitionFee", "capReduction", "residualPct", "termMonths", "moneyFactor", "baseMoneyFactor", "taxRatePct"].forEach(
      function (id) {
        els[id].addEventListener("input", function () {
          update(id);
        });
      }
    );
    els.apr.addEventListener("input", function () {
      update("apr");
    });
    els.reset.addEventListener("click", function () {
      applyDefaults();
      update();
    });
    Array.prototype.forEach.call(els.table.querySelectorAll("th[data-key]"), function (th) {
      th.addEventListener("click", function () {
        var key = th.getAttribute("data-key");
        if (sortState.key === key) sortState.dir *= -1;
        else {
          sortState.key = key;
          sortState.dir = 1;
        }
        update();
      });
    });
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
