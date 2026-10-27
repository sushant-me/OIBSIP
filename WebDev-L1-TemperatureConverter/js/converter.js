(function () {
  "use strict";

  var form = document.getElementById("converter-form");
  if (!form) {
    return;
  }

  var input = document.getElementById("temperature");
  var unitSymbol = document.getElementById("input-unit-symbol");
  var status = document.getElementById("status");
  var errorBox = document.getElementById("error-message");
  var errorText = document.getElementById("error-text");
  var resetButton = document.getElementById("reset-button");

  var SYMBOLS = { C: "\u00B0C", F: "\u00B0F", K: "K" };
  var ABSOLUTE_ZERO_C = -273.15;
  var EPSILON = 1e-9;
  var NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

  var formatter = null;
  try {
    formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  } catch (ignore) {
    formatter = null;
  }

  /* Result tiles — collect by their data-value attribute. */
  var results = {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-value]"), function (el) {
    results[el.getAttribute("data-value")] = el;
  });

  function selectedUnit() {
    var checked = form.querySelector('input[name="unit"]:checked');
    return checked ? checked.value : "C";
  }

  function parseTemperature(raw) {
    var text = String(raw == null ? "" : raw).trim();
    if (text === "") {
      return { error: "empty" };
    }
    if (!NUMBER_PATTERN.test(text)) {
      return { error: "not-a-number" };
    }
    var value = Number(text);
    if (!isFinite(value)) {
      return { error: "not-a-number" };
    }
    return { value: value };
  }

  function toCelsius(value, unit) {
    if (unit === "F") {
      return ((value - 32) * 5) / 9;
    }
    if (unit === "K") {
      return value - 273.15;
    }
    return value;
  }

  function formatNumber(value) {
    if (typeof value !== "number" || !isFinite(value)) {
      return "\u2014";
    }
    /* Normalise negative zero and float dust like -0.0000000001. */
    if (Math.abs(value) < 5e-9) {
      value = 0;
    }
    if (formatter) {
      return formatter.format(value);
    }
    return String(Math.round(value * 100) / 100);
  }

  function setResults(celsius) {
    if (!results.C || !results.F || !results.K) {
      return;
    }
    results.C.textContent = formatNumber(celsius);
    results.F.textContent = formatNumber((celsius * 9) / 5 + 32);
    results.K.textContent = formatNumber(celsius + 273.15);
  }

  function clearResults() {
    if (!results.C || !results.F || !results.K) {
      return;
    }
    results.C.textContent = "\u2014";
    results.F.textContent = "\u2014";
    results.K.textContent = "\u2014";
  }

  function showError(message) {
    errorText.textContent = message;
    errorBox.hidden = false;
    input.setAttribute("aria-invalid", "true");
    status.textContent = "No conversion yet \u2014 please fix the value above.";
  }

  function clearError() {
    errorBox.hidden = true;
    errorText.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function updateUnitSymbol() {
    if (unitSymbol) {
      unitSymbol.textContent = SYMBOLS[selectedUnit()];
    }
  }

  /**
   * @param {"submit"|"live"} mode
   */
  function convert(mode) {
    var unit = selectedUnit();
    var parsed = parseTemperature(input.value);

    if (parsed.error === "empty") {
      clearResults();
      if (mode === "submit") {
        showError(
          "Please enter a temperature before converting \u2014 digits only, for example 21.5 or -4."
        );
      } else {
        clearError();
        status.textContent = "Waiting for a value\u2026";
      }
      return;
    }

    if (parsed.error) {
      clearResults();
      showError(
        "That doesn\u2019t look like a number. Use digits only \u2014 for example 21.5, -4 or 98.6."
      );
      return;
    }

    var celsius = toCelsius(parsed.value, unit);

    if (celsius < ABSOLUTE_ZERO_C - EPSILON) {
      clearResults();
      showError(
        "Below absolute zero: " +
          formatNumber(parsed.value) +
          " " +
          SYMBOLS[unit] +
          " is colder than \u2212273.15 \u00B0C (\u2212459.67 \u00B0F / 0 K), the coldest possible temperature. Enter a value at or above absolute zero."
      );
      return;
    }

    /* Snap the exact absolute-zero boundary so Kelvin reads 0, not 1e-13. */
    if (Math.abs(celsius - ABSOLUTE_ZERO_C) < EPSILON) {
      celsius = ABSOLUTE_ZERO_C;
    }

    clearError();
    setResults(celsius);

    if (mode === "submit") {
      status.textContent =
        "Converted " + formatNumber(parsed.value) + " " + SYMBOLS[unit] +
        " \u2014 showing all three units.";
    } else {
      status.textContent = "Live conversion on \u2014 all three units update as you type.";
    }
  }

  /* Convert button and Enter key both submit the form. */
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    convert("submit");
  });

  /* Live conversion as the user types. */
  input.addEventListener("input", function () {
    convert("live");
  });

  /*
   * A number input silently swallows letters, so tell the user why nothing
   * appeared instead of leaving them guessing. Shortcuts are ignored.
   */
  input.addEventListener("keydown", function (event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.key.length !== 1 || /^[0-9.+\-eE]$/.test(event.key)) {
      return;
    }
    showError(
      "Only digits, a decimal point and a minus sign work here \u2014 for example 21.5 or -4."
    );
  });

  /* Recompute immediately when the input unit changes. */
  Array.prototype.forEach.call(
    form.querySelectorAll('input[name="unit"]'),
    function (radio) {
      radio.addEventListener("change", function () {
        updateUnitSymbol();
        if (input.value.trim() !== "") {
          convert("live");
        }
      });
    }
  );

  /* Reset restores the empty form, the Celsius unit and the idle results. */
  resetButton.addEventListener("click", function () {
    form.reset();
    input.value = "";
    clearError();
    clearResults();
    updateUnitSymbol();
    status.textContent = "Waiting for a value\u2026";
    input.focus();
  });

  updateUnitSymbol();
})();
