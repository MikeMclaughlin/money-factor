(function () {
  "use strict";

  var E = window.Estimator;
  if (!E) return;

  var state = {
    msrp: E.DEFAULTS.msrp,
    sellingPrice: E.DEFAULTS.sellingPrice,
    down: E.DEFAULTS.down,
    incentiveTotal: E.DEFAULTS.incentiveTotal,
    offerTotal: E.DEFAULTS.offerTotal,
    fees: E.DEFAULTS.fees,
    taxRate: E.DEFAULTS.taxRate,
    moneyFactor: E.DEFAULTS.moneyFactor,
    term: E.DEFAULTS.term,
    mileage: E.DEFAULTS.mileage,
    mode: "lease",
  };

  var root = document.querySelector("[data-estimator]");
  if (!root) return;

  function $(sel, el) {
    return (el || root).querySelector(sel);
  }

  function $all(sel, el) {
    return Array.prototype.slice.call((el || root).querySelectorAll(sel));
  }

  function money(v, digits) {
    return E.formatMoney(v, digits);
  }

  function moneySmart(v) {
    return E.formatMoneySmart(v);
  }

  function fillInput(sel, value) {
    var el = $(sel);
    if (!el || document.activeElement === el) return;
    el.value = value;
  }

  function setText(sel, val) {
    $all(sel).forEach(function (el) {
      el.textContent = val;
    });
  }

  function render() {
    var result = E.compute(state);
    root.dataset.mode = state.mode;

    $all("[data-mode-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-mode-btn") === state.mode));
    });

    fillInput("[data-msrp]", result.msrp.toLocaleString("en-US"));
    fillInput("[data-incentives]", result.incentiveTotal.toLocaleString("en-US"));
    fillInput("[data-offer-total-input]", result.offerTotal.toLocaleString("en-US"));
    fillInput("[data-down]", Math.round(result.down).toLocaleString("en-US"));
    fillInput("[data-tax-rate]", (result.taxRate * 100).toFixed(1));
    fillInput(
      "[data-tax]",
      result.tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    fillInput(
      "[data-fees]",
      result.fees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    fillInput("[data-mf]", result.moneyFactor.toFixed(5));
    fillInput("[data-term-input]", String(result.term));

    var downPct = $("[data-down-pct]");
    if (downPct) downPct.textContent = "Down Payment (" + result.downPct.toFixed(2) + "%)";

    $all("[data-miles]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Number(btn.getAttribute("data-miles")) === state.mileage));
    });

    setText("[data-msrp-display]", moneySmart(result.msrp));
    setText("[data-mf-display]", result.moneyFactor.toFixed(5));
    setText("[data-apr-display]", result.apr.toFixed(2) + "%");
    setText("[data-residual-display]", money(result.residual));
    setText("[data-cap]", moneySmart(result.adjustedCap));
    setText("[data-due]", moneySmart(result.dueAtSigningDisplay));
    setText("[data-due-down]", moneySmart(result.down));
    setText("[data-due-tax]", money(result.tax));
    setText("[data-due-fees]", money(result.fees));
    setText("[data-due-first]", money(result.baseMonthly));
    setText("[data-monthly]", money(result.baseMonthly));
    setText("[data-fin-amount]", money(result.amountFinanced));
    setText("[data-fin-monthly]", money(result.financeMonthly));
    setText("[data-fin-apr]", (result.financeApr * 100).toFixed(2) + "%");
    setText("[data-fin-tax]", money(result.tax));
    setText("[data-fin-fees]", money(result.fees));
  }

  function parseMoneyInput(el) {
    return E.num(el.value, 0);
  }

  function bindMoney(sel, key) {
    var el = $(sel);
    if (!el) return;
    el.addEventListener("input", function () {
      state[key] = parseMoneyInput(this);
      if (key === "msrp") state.sellingPrice = state.msrp;
      render();
    });
  }

  $all("[data-mode-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.mode = btn.getAttribute("data-mode-btn");
      render();
    });
  });

  $all("[data-miles]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.mileage = Number(btn.getAttribute("data-miles"));
      render();
    });
  });

  bindMoney("[data-msrp]", "msrp");
  bindMoney("[data-incentives]", "incentiveTotal");
  bindMoney("[data-offer-total-input]", "offerTotal");
  bindMoney("[data-down]", "down");
  bindMoney("[data-fees]", "fees");
  bindMoney("[data-mf]", "moneyFactor");

  var taxRateEl = $("[data-tax-rate]");
  if (taxRateEl) {
    taxRateEl.addEventListener("input", function () {
      state.taxRate = parseMoneyInput(this) / 100;
      render();
    });
  }

  var termEl = $("[data-term-input]");
  if (termEl) {
    termEl.addEventListener("input", function () {
      state.term = Math.max(1, Math.round(E.num(this.value, state.term)));
      render();
    });
  }

  render();
})();
