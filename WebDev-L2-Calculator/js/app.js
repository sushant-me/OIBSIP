(function () {
  'use strict';

  // Constants
  var MAX_DIGITS = 15;       // digits allowed in a single typed operand
  var MAX_HISTORY = 30;      // history entries kept in memory
  var OP_GLYPH = { '+': '+', '-': '\u2212', '*': '\u00D7', '/': '\u00F7' };
  var CALC_ERROR = 'Cannot divide by zero';

  function CalcError(message) {
    this.name = 'CalcError';
    this.message = message;
  }
  CalcError.prototype = Object.create(Error.prototype);
  CalcError.prototype.constructor = CalcError;

  function countDigits(text) {
    var matches = String(text).match(/\d/g);
    return matches ? matches.length : 0;
  }

  // Trims binary rounding noise (0.1 + 0.2) without disturbing whole numbers.
  function tidy(value) {
    if (!Number.isFinite(value)) {
      return null;
    }
    if (Object.is(value, -0)) {
      value = 0;
    }
    if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
      return value;
    }
    return Number(value.toPrecision(15));
  }

  function groupDigits(raw) {
    var text = String(raw);
    if (text.indexOf('e') !== -1 || text.indexOf('E') !== -1) {
      return text;
    }
    var negative = text.charAt(0) === '-';
    var body = negative ? text.slice(1) : text;
    var dot = body.indexOf('.');
    var integerPart = dot === -1 ? body : body.slice(0, dot);
    var fractionPart = dot === -1 ? '' : body.slice(dot);
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (integerPart === '') {
      integerPart = '0';
    }
    return (negative ? '-' : '') + integerPart + fractionPart;
  }

  function formatResult(raw) {
    var value = Number(raw);
    if (!Number.isFinite(value)) {
      return 'Error';
    }
    value = tidy(value);
    var magnitude = Math.abs(value);
    if (magnitude !== 0 && (magnitude > Number.MAX_SAFE_INTEGER || magnitude < 1e-6)) {
      // Results beyond exact integer precision — or vanishingly small — switch
      // to scientific notation so the display stays readable.
      return value.toExponential(6).replace(/\.?0+e/, 'e');
    }
    return groupDigits(String(value));
  }

  var history = [];

  var state = {
    tokens: [],           // [{ type: 'num', raw: '5' }, { type: 'op', op: '+' }]
    current: '',          // the operand being typed, e.g. '12.5'
    justEvaluated: false, // last action was '='
    lastExpression: '',   // expression string shown after '='
    lastResult: '',       // numeric string of the last result
    repeat: null,         // { op, operand } used by repeated '='
    error: '',            // friendly error message, or ''
    errorExpression: ''   // expression that caused the error
  };

  var els = {};

  function qs(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    els.displayPanel = qs('display-panel');
    els.display = qs('display');
    els.expression = qs('expression');
    els.keypad = qs('keypad');
    els.historyList = qs('history-list');
    els.historyEmpty = qs('history-empty');
    els.clearHistory = qs('clear-history');
  }

  function tokenToText(token) {
    return token.type === 'num' ? groupDigits(token.raw) : OP_GLYPH[token.op];
  }

  function expressionFromTokens(tokens) {
    return tokens.map(tokenToText).join(' ');
  }

  function liveExpression() {
    var parts = state.tokens.map(tokenToText);
    if (state.current !== '') {
      parts.push(groupDigits(state.current));
    }
    return parts.join(' ');
  }

  function trailingNumber() {
    for (var index = state.tokens.length - 1; index >= 0; index -= 1) {
      if (state.tokens[index].type === 'num') {
        return state.tokens[index].raw;
      }
    }
    return '';
  }

  function activeOperator() {
    if (state.justEvaluated || state.error) {
      return '';
    }
    var last = state.tokens[state.tokens.length - 1];
    return last && last.type === 'op' ? last.op : '';
  }

  function updateOperatorStates() {
    var active = activeOperator();
    var buttons = els.keypad.querySelectorAll('[data-action="operator"]');
    for (var index = 0; index < buttons.length; index += 1) {
      var button = buttons[index];
      var isActive = button.dataset.op === active;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('is-active', isActive);
    }
  }

  function displaySizeFor(text) {
    var length = text.length;
    if (length > 20) {
      return 'xs';
    }
    if (length > 15) {
      return 'sm';
    }
    if (length > 12) {
      return 'md';
    }
    return 'normal';
  }

  function render() {
    var valueText;
    if (state.error) {
      valueText = state.error;
    } else if (state.current !== '') {
      valueText = groupDigits(state.current);
    } else if (state.justEvaluated && state.lastResult !== '') {
      valueText = formatResult(state.lastResult);
    } else {
      valueText = trailingNumber() ? groupDigits(trailingNumber()) : '0';
    }

    var expressionText;
    if (state.error) {
      expressionText = state.errorExpression;
    } else if (state.justEvaluated) {
      expressionText = state.lastExpression;
    } else {
      expressionText = liveExpression();
    }

    els.display.textContent = valueText;
    els.display.dataset.size = displaySizeFor(valueText);
    els.display.classList.toggle('is-error', Boolean(state.error));
    els.displayPanel.classList.toggle('has-error', Boolean(state.error));
    els.expression.textContent = expressionText || 'Ready';

    updateOperatorStates();
  }

  function flashDisplay() {
    els.display.classList.remove('is-fresh');
    void els.display.offsetWidth;
    els.display.classList.add('is-fresh');
  }

  function renderHistory() {
    els.historyList.textContent = '';
    history.forEach(function (entry) {
      var item = document.createElement('li');
      var button = document.createElement('button');
      var expression = document.createElement('span');
      var result = document.createElement('span');

      button.type = 'button';
      button.className = 'history__entry';
      button.setAttribute('aria-label', 'Load result ' + formatResult(entry.raw) + ' from ' + entry.expression);

      expression.className = 'history__expression';
      expression.textContent = entry.expression;

      result.className = 'history__result';
      result.textContent = formatResult(entry.raw);

      button.appendChild(expression);
      button.appendChild(result);
      button.addEventListener('click', function () {
        loadHistoryResult(entry.raw);
      });

      item.appendChild(button);
      els.historyList.appendChild(item);
    });

    els.historyEmpty.hidden = history.length > 0;
    els.clearHistory.disabled = history.length === 0;
  }

  function addHistory(expression, raw) {
    history.unshift({ expression: expression, raw: raw });
    if (history.length > MAX_HISTORY) {
      history.pop();
    }
    renderHistory();
  }

  function loadHistoryResult(raw) {
    resetAll();
    state.current = String(raw);
    render();
    flashDisplay();
  }

  function clearHistory() {
    history = [];
    renderHistory();
  }

  function resetAll() {
    state.tokens = [];
    state.current = '';
    state.justEvaluated = false;
    state.lastExpression = '';
    state.lastResult = '';
    state.repeat = null;
    state.error = '';
    state.errorExpression = '';
  }

  function showError(message, expression) {
    state.error = message;
    state.errorExpression = expression || '';
    state.tokens = [];
    state.current = '';
    state.justEvaluated = false;
    state.lastExpression = '';
    state.lastResult = '';
    state.repeat = null;
    render();
  }

  function pressDigit(digit) {
    if (state.error) {
      resetAll();
    }
    if (state.justEvaluated) {
      resetAll();
    }
    if (countDigits(state.current) >= MAX_DIGITS) {
      return; // ignore extra digits rather than lose precision silently
    }
    if (state.current === '0') {
      state.current = digit;
    } else if (state.current === '-0') {
      state.current = digit === '0' ? '-0' : '-' + digit;
    } else {
      state.current += digit;
    }
    render();
  }

  function pressDecimal() {
    if (state.error) {
      resetAll();
    }
    if (state.justEvaluated) {
      resetAll();
      state.current = '0.';
      render();
      return;
    }
    if (state.current === '') {
      state.current = '0.';
    } else if (state.current.indexOf('.') === -1) {
      state.current += '.';
    }
    render();
  }

  function pressOperator(op) {
    if (state.error) {
      resetAll();
      render();
      return;
    }

    if (state.justEvaluated) {
      state.tokens = [{ type: 'num', raw: state.lastResult }];
      state.current = '';
      state.justEvaluated = false;
      state.lastExpression = '';
      state.repeat = null;
      state.tokens.push({ type: 'op', op: op });
      render();
      return;
    }

    if (state.current !== '') {
      state.tokens.push({ type: 'num', raw: state.current });
      state.current = '';
      state.tokens.push({ type: 'op', op: op });
      render();
      return;
    }

    if (state.tokens.length === 0) {
      return;
    }

    var last = state.tokens[state.tokens.length - 1];
    if (last.type === 'op') {
      // Pressing two operators in a row swaps the pending operator.
      state.tokens[state.tokens.length - 1] = { type: 'op', op: op };
      render();
      return;
    }

    state.tokens.push({ type: 'op', op: op });
    render();
  }

  function toggleSign() {
    if (state.error) {
      resetAll();
      render();
      return;
    }

    if (state.justEvaluated) {
      var result = tidy(Number(state.lastResult));
      if (result === null) {
        return;
      }
      resetAll();
      state.current = String(-result);
      render();
      return;
    }

    if (state.current !== '') {
      state.current = state.current.charAt(0) === '-'
        ? state.current.slice(1)
        : '-' + state.current;
    } else {
      var lastNumber = null;
      for (var index = state.tokens.length - 1; index >= 0; index -= 1) {
        if (state.tokens[index].type === 'num') {
          lastNumber = state.tokens[index];
          break;
        }
      }
      if (!lastNumber) {
        return;
      }
      lastNumber.raw = lastNumber.raw.charAt(0) === '-'
        ? lastNumber.raw.slice(1)
        : '-' + lastNumber.raw;
    }
    render();
  }

  function applyPercent() {
    if (state.error) {
      resetAll();
      render();
      return;
    }

    if (state.justEvaluated) {
      var converted = tidy(Number(state.lastResult) / 100);
      if (converted === null) {
        return;
      }
      resetAll();
      state.current = String(converted);
      render();
      return;
    }

    if (state.current === '') {
      return;
    }

    var percentValue = tidy(Number(state.current) / 100);
    if (percentValue === null) {
      return;
    }
    state.current = String(percentValue);
    render();
  }

  function backspace() {
    if (state.error) {
      resetAll();
      render();
      return;
    }

    if (state.justEvaluated) {
      resetAll();
      render();
      return;
    }

    if (state.current.length > 0) {
      state.current = state.current.slice(0, -1);
      if (state.current === '-') {
        state.current = '';
      }
      render();
      return;
    }

    if (state.tokens.length > 0) {
      var last = state.tokens[state.tokens.length - 1];
      if (last.type === 'op') {
        state.tokens.pop();
        var previous = state.tokens[state.tokens.length - 1];
        if (previous && previous.type === 'num') {
          // Pull the operand back into the edit buffer for backspacing.
          state.current = state.tokens.pop().raw;
        }
      }
    }
    render();
  }

  function clearAll() {
    resetAll();
    render();
  }

  function evaluateTokens(tokens) {
    // Pass 1 — resolve multiplication and division (standard precedence).
    var reduced = [];
    for (var index = 0; index < tokens.length; index += 1) {
      var token = tokens[index];
      if (token.type === 'num') {
        reduced.push(token);
        continue;
      }
      if (token.op === '+' || token.op === '-') {
        reduced.push(token);
        continue;
      }

      var left = reduced.pop();
      var right = tokens[index + 1];
      index += 1;
      if (!left || !right || left.type !== 'num' || right.type !== 'num') {
        throw new CalcError('Incomplete expression');
      }
      var a = Number(left.raw);
      var b = Number(right.raw);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        throw new CalcError('Invalid number');
      }
      var partial;
      if (token.op === '/') {
        if (b === 0) {
          throw new CalcError(CALC_ERROR);
        }
        partial = a / b;
      } else {
        partial = a * b;
      }
      if (!Number.isFinite(partial)) {
        throw new CalcError('Result is out of range');
      }
      reduced.push({ type: 'num', raw: String(tidy(partial)) });
    }

    // Pass 2 — resolve addition and subtraction left-to-right.
    if (reduced.length === 0 || reduced[0].type !== 'num') {
      throw new CalcError('Incomplete expression');
    }
    var total = Number(reduced[0].raw);
    for (var position = 1; position < reduced.length; position += 2) {
      var operator = reduced[position];
      var operand = reduced[position + 1];
      if (!operator || operator.type !== 'op' || !operand || operand.type !== 'num') {
        throw new CalcError('Incomplete expression');
      }
      var value = Number(operand.raw);
      total = operator.op === '+' ? total + value : total - value;
      if (!Number.isFinite(total)) {
        throw new CalcError('Result is out of range');
      }
    }
    return tidy(total);
  }

  function deriveRepeat(tokens) {
    var length = tokens.length;
    if (length >= 3 &&
        tokens[length - 2].type === 'op' &&
        tokens[length - 1].type === 'num') {
      return { op: tokens[length - 2].op, operand: tokens[length - 1].raw };
    }
    return null;
  }

  function pressEquals() {
    if (state.error) {
      resetAll();
      render();
      return;
    }

    var tokens;
    if (state.justEvaluated && state.repeat) {
      // Repeated '=' re-applies the last binary operation.
      tokens = [
        { type: 'num', raw: state.lastResult },
        { type: 'op', op: state.repeat.op },
        { type: 'num', raw: state.repeat.operand }
      ];
    } else {
      tokens = state.tokens.slice();
      if (state.current !== '') {
        tokens.push({ type: 'num', raw: state.current });
      }
      while (tokens.length > 0 && tokens[tokens.length - 1].type === 'op') {
        tokens.pop();
      }
      if (tokens.length === 0) {
        return;
      }
    }

    var expression = expressionFromTokens(tokens) + ' =';

    try {
      var value = evaluateTokens(tokens);
      if (value === null) {
        throw new CalcError('Result is out of range');
      }
      state.lastExpression = expression;
      state.repeat = deriveRepeat(tokens);
      state.lastResult = String(value);
      state.tokens = [];
      state.current = '';
      state.justEvaluated = true;
      state.error = '';
      state.errorExpression = '';
      addHistory(expression, state.lastResult);
      render();
      flashDisplay();
    } catch (error) {
      if (error instanceof CalcError) {
        showError(error.message, expression);
      } else {
        showError('Something went wrong', expression);
      }
    }
  }

  function handleAction(button) {
    var action = button.dataset.action;
    switch (action) {
      case 'digit':
        pressDigit(button.dataset.digit);
        break;
      case 'decimal':
        pressDecimal();
        break;
      case 'operator':
        pressOperator(button.dataset.op);
        break;
      case 'equals':
        pressEquals();
        break;
      case 'clear':
        clearAll();
        break;
      case 'backspace':
        backspace();
        break;
      case 'sign':
        toggleSign();
        break;
      case 'percent':
        applyPercent();
        break;
      default:
        break;
    }
  }

  function bindKeypad() {
    var buttons = els.keypad.querySelectorAll('button');
    for (var index = 0; index < buttons.length; index += 1) {
      buttons[index].addEventListener('click', function (event) {
        handleAction(event.currentTarget);
      });
    }
  }

  function pulseKey(button) {
    if (!button) {
      return;
    }
    button.classList.add('is-pressed');
    window.setTimeout(function () {
      button.classList.remove('is-pressed');
    }, 110);
  }

  function findKeyButton(action, value) {
    var selector = '[data-action="' + action + '"]';
    var matches = els.keypad.querySelectorAll(selector);
    for (var index = 0; index < matches.length; index += 1) {
      var button = matches[index];
      if (value === undefined ||
          button.dataset.digit === value ||
          button.dataset.op === value) {
        return button;
      }
    }
    return null;
  }

  function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    var key = event.key;
    var action = null;
    var value;

    if (/^[0-9]$/.test(key)) {
      action = 'digit';
      value = key;
      pressDigit(key);
    } else if (key === '.') {
      action = 'decimal';
      pressDecimal();
    } else if (key === '+') {
      action = 'operator';
      value = '+';
      pressOperator('+');
    } else if (key === '-') {
      action = 'operator';
      value = '-';
      pressOperator('-');
    } else if (key === '*' || key === 'x' || key === 'X') {
      action = 'operator';
      value = '*';
      pressOperator('*');
    } else if (key === '/') {
      action = 'operator';
      value = '/';
      pressOperator('/');
    } else if (key === 'Enter' || key === '=') {
      action = 'equals';
      pressEquals();
    } else if (key === 'Backspace') {
      action = 'backspace';
      backspace();
    } else if (key === 'Escape' || key === 'Delete') {
      action = 'clear';
      clearAll();
    } else if (key === '%') {
      action = 'percent';
      applyPercent();
    } else if (key === 's' || key === 'S') {
      action = 'sign';
      toggleSign();
    } else if (key === 'c' || key === 'C') {
      action = 'clear';
      clearAll();
    }

    if (action === null) {
      return;
    }

    event.preventDefault();
    pulseKey(findKeyButton(action, value));
  }

  function init() {
    cacheElements();

    if (!els.display || !els.keypad) {
      return;
    }

    bindKeypad();
    els.clearHistory.addEventListener('click', clearHistory);

    document.addEventListener('keydown', handleKeydown);
    els.display.addEventListener('animationend', function () {
      els.display.classList.remove('is-fresh');
    });

    renderHistory();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
