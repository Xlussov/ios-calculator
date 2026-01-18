import {
  NUMBER_MAP,
  BINARY_OPERATOR_MAP,
  GROUPING_MAP,
  UNARY_MAP,
  CONSTANT_MAP,
} from './dataHints.js';

export class Calculator {
  constructor({ displayEl, onHistorySave, acButton, ceButton }) {
    this.displayEl = displayEl;
    this.equalPressed = false;

    this.acLabel = acButton;
    this.ceIcon = ceButton;
    this.onHistorySave = onHistorySave;

    this.clearMode = 'AC';
    this.toggleClearBtn('AC');

    this.isDragging = false;
    this.startX = 0;
    this.scrollStart = 0;

    this.initScrollListeners();
  }

  initScrollListeners() {
    const slider = this.displayEl;

    slider.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.startX = e.pageX - slider.offsetLeft;
      this.scrollStart = slider.scrollLeft;

      slider.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    });

    slider.addEventListener('mouseleave', () => {
      this.isDragging = false;
      slider.style.cursor = 'default';
      document.body.style.userSelect = '';
    });

    slider.addEventListener('mouseup', () => {
      this.isDragging = false;
      slider.style.cursor = 'default';
      document.body.style.userSelect = '';
    });

    slider.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      e.preventDefault();

      const x = e.pageX - slider.offsetLeft;
      const walk = (x - this.startX) * 1;
      slider.scrollLeft = this.scrollStart - walk;
    });
  }

  scrollToRight() {
    requestAnimationFrame(() => {
      this.displayEl.scrollLeft = this.displayEl.scrollWidth;
    });
  }

  toggleClearBtn(mode) {
    this.clearMode = mode;
    if (mode === 'CE') {
      this.acLabel.classList.add('hidden');
      this.ceIcon.classList.remove('hidden');
    } else {
      this.acLabel.classList.remove('hidden');
      this.ceIcon.classList.add('hidden');
    }
  }

  input(type, value) {
    if (type !== 'UNARY_FUNCTION' || (value !== 'CLEAR' && value !== 'EQUALS')) {
      this.toggleClearBtn('CE');
    }

    switch (type) {
      case 'NUMBER':
        this.appendNumber(NUMBER_MAP[value]);
        break;
      case 'BINARY_OPERATOR':
        this.appendBinary(BINARY_OPERATOR_MAP[value]);
        break;
      case 'GROUPING':
        this.appendGrouping(GROUPING_MAP[value]);
        break;
      case 'UNARY_FUNCTION':
        this.handleUnary(value);
        break;
      case 'CONSTANT':
        this.appendConstant(CONSTANT_MAP[value]);
        this.toggleClearBtn('CE');
        break;
    }
  }

  handleUnary(value) {
    if (value === 'CLEAR') {
      if (this.clearMode === 'CE') {
        this.backspace();
      } else {
        this.clear();
      }
      return;
    }

    if (value === 'EQUALS') {
      this.evaluate();
      this.toggleClearBtn('AC');
      return;
    }

    if (value === 'SIGN') {
      this.toggleSign();
      return;
    }

    const mapped = UNARY_MAP[value];
    if (!mapped) return;

    this.toggleClearBtn('CE');

    if (mapped.endsWith('(')) {
      if (this.equalPressed) {
        this.displayEl.textContent = mapped + this.displayEl.textContent;
        this.equalPressed = false;
        this.scrollToRight();
        return;
      }
      const text = this.displayEl.textContent;
      const match = text.match(/(\d+(\.\d+)?|π)$/);
      if (match) {
        const number = match[0];
        const before = text.slice(0, -number.length);
        this.displayEl.textContent = before + mapped + number;
        this.scrollToRight();
        return;
      }
    }

    if (this.equalPressed) {
      this.equalPressed = false;
    }

    if (mapped === '!') {
      const last = this.lastChar();
      if (this.isOperator(last) || last === '(') {
        this.appendNumber('1');
      }
    }

    this.append(mapped);
  }

  backspace() {
    let text = this.displayEl.textContent;

    if (text === 'Error' || text.length === 1) {
      this.displayEl.textContent = '0';
      this.toggleClearBtn('AC');
    } else {
      this.displayEl.textContent = text.slice(0, -1);
    }
    this.scrollToRight();
  }

  toggleSign() {
    this.toggleClearBtn('CE');

    if (this.equalPressed) {
      const val = Number(this.displayEl.textContent);
      this.displayEl.textContent = String(val * -1);
      this.scrollToRight();
      return;
    }

    const text = this.displayEl.textContent;
    if (text === '0') return;

    let i = text.length - 1;
    let newText = text;

    if (text[i] === ')') {
      let depth = 1;
      i--;
      while (i >= 0 && depth > 0) {
        if (text[i] === ')') depth++;
        if (text[i] === '(') depth--;
        i--;
      }
      const openParenIndex = i + 1;
      if (text[openParenIndex] === '(' && text[openParenIndex + 1] === '-') {
        const content = text.slice(openParenIndex + 2, -1);
        const before = text.slice(0, openParenIndex);
        newText = before + content;
      } else {
        let startOfToken = openParenIndex;
        while (startOfToken > 0 && /[a-z√∛]/.test(text[startOfToken - 1])) {
          startOfToken--;
        }
        const token = text.slice(startOfToken);
        const before = text.slice(0, startOfToken);
        newText = before + '(-' + token + ')';
      }
    } else if (/\d/.test(text[i])) {
      while (i >= 0 && /[\d.]/.test(text[i])) {
        i--;
      }
      const startOfNumber = i + 1;
      if (startOfNumber === 1 && text[0] === '-') {
        newText = text.slice(1);
      } else {
        const token = text.slice(startOfNumber);
        const before = text.slice(0, startOfNumber);
        newText = before + '(-' + token + ')';
      }
    }

    this.displayEl.textContent = newText;
    this.scrollToRight();
  }

  append(char) {
    if (!char) return;

    if (this.displayEl.textContent === '0') {
      if (char === '!' || char === '.') {
        this.displayEl.textContent += char;
      } else {
        this.displayEl.textContent = char;
      }
    } else {
      this.displayEl.textContent += char;
    }

    this.scrollToRight();
  }

  appendNumber(char) {
    if (this.equalPressed) {
      this.clear();
      this.toggleClearBtn('CE');
    }

    const last = this.lastChar();
    if (/[π)!]/.test(last) && !this.isOperator(last)) {
      this.append('*');
    }
    this.append(char);
  }

  appendConstant(char) {
    if (this.equalPressed) {
      this.clear();
      this.toggleClearBtn('CE');
    }

    const last = this.lastChar();
    if (/[\d)!]/.test(last) && !this.isOperator(last) && this.displayEl.textContent !== '0') {
      this.append('*');
    }
    this.append(char);
  }

  appendGrouping(char) {
    if (this.equalPressed) {
      this.clear();
      this.toggleClearBtn('CE');
    }

    const last = this.lastChar();
    if (
      char === '(' &&
      /[\dπ)!]/.test(last) &&
      !this.isOperator(last) &&
      this.displayEl.textContent !== '0'
    ) {
      this.append('*');
    }
    this.append(char);
  }

  appendBinary(char) {
    if (this.equalPressed) {
      this.equalPressed = false;
    }
    this.toggleClearBtn('CE');

    const last = this.lastChar();
    const text = this.displayEl.textContent;

    if (this.isOperator(last)) {
      this.displayEl.textContent = text.slice(0, -1) + char;
      this.scrollToRight();
      return;
    }

    if (text === '0' || text === '') {
      this.displayEl.textContent = '0' + char;
      this.scrollToRight();
    } else {
      this.append(char);
    }
  }

  lastChar() {
    return this.displayEl.textContent.slice(-1);
  }

  isOperator(char) {
    return '+-*/%'.includes(char);
  }

  clear() {
    this.displayEl.textContent = '0';
    this.equalPressed = false;
    this.toggleClearBtn('AC');
    this.displayEl.scrollLeft = 0;
  }

  evaluate() {
    this.equalPressed = true;
    const expression = this.displayEl.textContent;

    try {
      const normalized = this.normalize(expression);
      const resultRaw = eval(normalized);

      if (!Number.isFinite(resultRaw)) throw new Error('Invalid expression');

      const resultFormatted = Number.isInteger(resultRaw)
        ? String(resultRaw)
        : resultRaw.toFixed(2);

      if (this.onHistorySave && expression !== resultFormatted) {
        this.onHistorySave({ expression, result: resultFormatted });
      }

      this.displayEl.textContent = resultFormatted;
      this.toggleClearBtn('AC');
      this.displayEl.scrollLeft = 0;
    } catch (e) {
      console.error(e);
      alert('Invalid expression');
      this.clear();
    }
  }

  normalize(expr) {
    let result = expr
      .replace(/\)\(/g, ')*(')
      .replace(/!\(/g, '!*(')
      .replace(/π(?=\d|\()/g, 'π*')
      .replace(/\)(?=\d|π)/g, ')*')
      .replaceAll('π', 'Math.PI')
      .replaceAll('sin', 'Math.sin')
      .replaceAll('cos', 'Math.cos')
      .replaceAll('tan', 'Math.tan')
      .replaceAll('√', 'Math.sqrt')
      .replaceAll('∛', 'Math.cbrt')
      .replaceAll('^2', '**2')
      .replaceAll('^3', '**3');

    const parenFactorial = /\(([^()]+)\)!/g;
    while (parenFactorial.test(result)) {
      result = result.replace(parenFactorial, (_, inner) => {
        const value = eval(inner);
        return this.factorial(value);
      });
    }

    result = result.replace(/(\d+(?:\.\d+)?)!/g, (_, n) => this.factorial(+n));
    return result;
  }

  factorial(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error('Factorial error');
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }
}
