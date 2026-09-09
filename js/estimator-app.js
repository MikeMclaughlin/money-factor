(function () {
  "use strict";

  var E = window.Estimator;
  if (!E) return;

  var state = {
    msrp: E.DEFAULTS.msrp,
    sellingPrice: E.DEFAULTS.sellingPrice,
    down: E.DEFAULTS.down,
    tradeIn: 0,
    term: 48,
    mileage: 12000,
    selectedOffers: ["loyalty"],
    mode: "lease",
    incentivesOpen: true,
    offersOpen: true,
    taxesOpen: false,
    dueOpen: true,
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

  function render() {
    var result = E.compute(state);
    root.dataset.mode = state.mode;

    $all("[data-mode-btn]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-mode-btn") === state.mode));
    });

    var msrpInput = $("[data-msrp]");
    if (msrpInput && document.activeElement !== msrpInput) {
      msrpInput.value = result.msrp.toLocaleString("en-US");
    }
    $all("[data-msrp-display]").forEach(function (el) {
      el.textContent = moneySmart(result.msrp);
    });

    var downInput = $("[data-down]");
    if (downInput && document.activeElement !== downInput) {
      downInput.value = Math.round(result.down).toLocaleString("en-US");
    }
    var downPct = $("[data-down-pct]");
    if (downPct) downPct.textContent = "Down Payment (" + result.downPct.toFixed(2) + "%)";

    $all("[data-term]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Number(btn.getAttribute("data-term")) === state.term));
    });
    $all("[data-miles]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(Number(btn.getAttribute("data-miles")) === state.mileage));
    });

    function setText(sel, val) {
      $all(sel).forEach(function (el) {
        el.textContent = val;
      });
    }

    setText("[data-incentive-total]", moneySmart(result.incentiveTotal));
    setText("[data-offer-total]", moneySmart(result.offerTotal));
    setText("[data-down-line]", moneySmart(result.down));
    setText("[data-trade]", moneySmart(result.tradeIn));
    setText("[data-cap]", moneySmart(result.adjustedCap));
    setText("[data-tax]", money(result.taxAndFees));
    setText("[data-due]", moneySmart(result.dueAtSigningDisplay));
    setText("[data-due-down]", moneySmart(result.down));
    setText("[data-due-tax]", money(result.taxAndFees));
    setText("[data-due-first]", money(result.baseMonthly));
    setText("[data-monthly]", money(result.baseMonthly));

    var incBody = $("[data-incentives-body]");
    if (incBody) incBody.classList.toggle("hidden", !state.incentivesOpen);
    var offBody = $("[data-offers-body]");
    if (offBody) offBody.classList.toggle("hidden", !state.offersOpen);
    var taxBody = $("[data-taxes-body]");
    if (taxBody) taxBody.classList.toggle("hidden", !state.taxesOpen);
    var dueBody = $("[data-due-body]");
    if (dueBody) dueBody.classList.toggle("hidden", !state.dueOpen);

    setText("[data-incentives-chev]", state.incentivesOpen ? "▴" : "▾");
    setText("[data-offers-chev]", state.offersOpen ? "▴" : "▾");
    setText("[data-taxes-chev]", state.taxesOpen ? "▴" : "▾");
    setText("[data-due-chev]", state.dueOpen ? "▴" : "▾");

    $all("[data-offer]").forEach(function (box) {
      box.checked = state.selectedOffers.indexOf(box.getAttribute("data-offer")) !== -1;
    });

    var incHost = $("[data-incentive-list]");
    if (incHost) {
      incHost.innerHTML = result.incentives
        .map(function (row) {
          return (
            '<div class="incentive-row">' +
            '<div class="left">' +
            sackSvg() +
            "<span>" +
            row.label +
            ' <span class="info tip">i<span class="tip-body">Manufacturer cash applied to capitalized cost.</span></span></span>' +
            "</div>" +
            "<div>" +
            moneySmart(row.amount) +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    setText("[data-fin-amount]", money(result.amountFinanced));
    setText("[data-fin-monthly]", money(result.financeMonthly));
    setText("[data-fin-apr]", (result.financeApr * 100).toFixed(2) + "%");
    setText("[data-cash-price]", money(result.cashPrice));
    setText("[data-lease-apr]", result.apr.toFixed(1) + "% APR equivalent");
  }

  function sackSvg() {
    return (
      '<svg class="sack" viewBox="0 0 16 16" aria-hidden="true">' +
      '<path fill="#2f9e44" d="M8 1.5c.8 0 1.4.4 1.9 1.1L11.5 5h1.2c.7 0 1.3.6 1.3 1.3v6.4c0 .7-.6 1.3-1.3 1.3H3.3C2.6 14 2 13.4 2 12.7V6.3C2 5.6 2.6 5 3.3 5h1.2L6.1 2.6C6.6 1.9 7.2 1.5 8 1.5z"/>' +
      '<path fill="#fff" d="M8 7.2a1.6 1.6 0 1 0 .02 3.2A1.6 1.6 0 0 0 8 7.2z"/>' +
      "</svg>"
    );
  }

  function parseMoneyInput(el) {
    return E.num(el.value, 0);
  }

  $all("[data-mode-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.mode = btn.getAttribute("data-mode-btn");
      render();
    });
  });

  $all("[data-term]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.term = Number(btn.getAttribute("data-term"));
      render();
    });
  });

  $all("[data-miles]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.mileage = Number(btn.getAttribute("data-miles"));
      render();
    });
  });

  var downEl = $("[data-down]");
  if (downEl) {
    downEl.addEventListener("input", function () {
      state.down = parseMoneyInput(this);
      render();
    });
  }

  var msrpEl = $("[data-msrp]");
  if (msrpEl) {
    msrpEl.addEventListener("input", function () {
      var v = parseMoneyInput(this);
      state.msrp = v;
      state.sellingPrice = v;
      render();
    });
  }

  $all("[data-offer]").forEach(function (box) {
    box.addEventListener("change", function () {
      var id = box.getAttribute("data-offer");
      if (box.checked) {
        if (state.selectedOffers.indexOf(id) === -1) state.selectedOffers.push(id);
      } else {
        state.selectedOffers = state.selectedOffers.filter(function (x) {
          return x !== id;
        });
      }
      render();
    });
  });

  function bindToggle(sel, key) {
    var el = $(sel);
    if (!el) return;
    el.addEventListener("click", function () {
      state[key] = !state[key];
      render();
    });
  }

  bindToggle("[data-toggle-incentives]", "incentivesOpen");
  bindToggle("[data-toggle-offers]", "offersOpen");
  bindToggle("[data-toggle-taxes]", "taxesOpen");
  bindToggle("[data-toggle-due]", "dueOpen");

  var closeBtn = $("[data-close]");
  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      window.close();
    });
  }

  var tradeBtn = $("[data-edit-trade]");
  if (tradeBtn) {
    tradeBtn.addEventListener("click", function () {
      var next = window.prompt("Trade-in equity applied to cap cost", String(state.tradeIn));
      if (next == null) return;
      state.tradeIn = Math.max(0, E.num(next, 0));
      render();
    });
  }

  render();
})();
