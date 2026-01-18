import { Calculator } from './core/calculator.js';

document.addEventListener('DOMContentLoaded', () => {
  const keypad = document.querySelector('.keypad');
  const display = document.querySelector('.display-content');

  const calcMode = document.getElementById('calc-mode');
  const calcOverlay = document.getElementById('calc-overlay');
  const menuItems = document.querySelectorAll('.menu-item');

  const historyButton = document.getElementById('history-button');
  const historyOverlay = document.getElementById('history-overlay');
  const doneButton = document.getElementById('done-button');
  const editButton = document.getElementById('edit-button');
  const clearButton = document.getElementById('clear-button');
  const historyList = document.getElementById('history-list');
  const template = document.getElementById('history-item-template');

  const acButton = document.getElementById('ac-button');
  const ceButton = document.getElementById('ce-button');

  const STORAGE_KEY = 'calculator_history_v1';
  const CalculatorModes = {
    BASIC: 'BASIC',
    SCIENTIFIC: 'SCIENTIFIC',
  };

  let currentMode = CalculatorModes.BASIC;

  if (!keypad || !display) {
    console.error('Calculator elements not found');
    return;
  }

  const enableMode = () => {
    if (currentMode === CalculatorModes.BASIC) {
      keypad.classList.remove('scientific-mode');
      keypad.classList.add('basic-mode');
    } else if (currentMode === CalculatorModes.SCIENTIFIC) {
      keypad.classList.remove('basic-mode');
      keypad.classList.add('scientific-mode');
    }
  };

  const setMode = mode => {
    if (Object.values(CalculatorModes).includes(mode)) {
      currentMode = mode;
    } else {
      console.warn('Unknown mode!');
    }
  };

  const openCalcMode = () => {
    calcMode.classList.add('active');
    calcOverlay.classList.add('active');
  };

  const closeCalcMode = () => {
    calcMode.classList.remove('active');
    calcOverlay.classList.remove('active');
  };

  const openHistoryMenu = () => {
    historyOverlay.classList.add('active');
  };

  const closeHistoryMenu = () => {
    historyOverlay.classList.remove('active');
  };

  const editmodeOn = () => {
    const historyBins = document.querySelectorAll('.historry-bin');
    historyBins.forEach(item => {
      item.classList.add('editMode');
    });
    editButton.textContent = 'Done editing';
    editButton.classList.add('editing');
  };

  const editmodeOff = () => {
    const historyBins = document.querySelectorAll('.historry-bin');
    historyBins.forEach(item => {
      item.classList.remove('editMode');
    });
    editButton.textContent = 'Edit';
    editButton.classList.remove('editing');
  };

  const getHistory = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  };

  const saveToLocalStorage = newHistoryArray => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistoryArray));
  };

  const showToast = message => {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  };

  const copyToClipboard = async text => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Copied!');
    }
  };

  const createHistoryItemNode = (item, originalIndex) => {
    const node = template.content.cloneNode(true);
    const exprEl = node.querySelector('.expression');
    const resEl = node.querySelector('.result');
    const binButton = node.querySelector('.historry-bin');

    exprEl.textContent = item.expression;
    resEl.textContent = item.result;

    exprEl.addEventListener('click', () => {
      copyToClipboard(item.expression);
    });
    exprEl.title = 'Click to copy expression';

    resEl.addEventListener('click', () => {
      copyToClipboard(item.result);
    });
    resEl.title = 'Click to copy result';

    if (editButton.classList.contains('editing')) {
      binButton.classList.add('editMode');
    }

    binButton.addEventListener('click', e => {
      e.stopPropagation();
      deleteHistoryItem(originalIndex);
    });

    return node;
  };

  const renderHistory = () => {
    historyList.innerHTML = '';
    const history = getHistory();

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-message">History is empty</p>';
      editmodeOff();
      return;
    }

    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      const node = createHistoryItemNode(item, i);
      historyList.append(node);
    }
  };

  const deleteHistoryItem = originalIndex => {
    const currentHistory = getHistory();
    currentHistory.splice(originalIndex, 1);
    saveToLocalStorage(currentHistory);
    renderHistory();
  };

  const addHistoryItem = ({ expression, result }) => {
    const currentHistory = getHistory();
    const newItem = { expression, result };
    currentHistory.push(newItem);
    saveToLocalStorage(currentHistory);
    renderHistory();
  };

  calcMode.addEventListener('click', e => {
    if (!calcMode.classList.contains('active')) {
      openCalcMode();
    }
  });

  calcOverlay.addEventListener('click', () => {
    if (calcOverlay.classList.contains('active')) {
      closeCalcMode();
    }
  });

  menuItems.forEach(item => {
    item.addEventListener('click', e => {
      const isActive = calcMode.classList.contains('active');
      if (!isActive) {
        return;
      }
      e.stopPropagation();
      menuItems.forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      setMode(item.id);
      enableMode();
      closeCalcMode();
    });
  });

  historyButton.addEventListener('click', () => {
    openHistoryMenu();
  });

  doneButton.addEventListener('click', () => {
    closeHistoryMenu();
    editmodeOff();
  });

  editButton.addEventListener('click', () => {
    const isEditing = editButton.classList.contains('editing');
    if (getHistory().length === 0) return;

    if (isEditing) {
      editmodeOff();
    } else {
      editmodeOn();
    }
  });

  clearButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear history?')) {
      saveToLocalStorage([]);
      renderHistory();
      editmodeOff();
    }
  });

  renderHistory();

  const calculator = new Calculator({
    displayEl: display,
    onHistorySave: addHistoryItem,
    acButton: acButton,
    ceButton: ceButton,
  });

  keypad.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'BASIC' || btn.id === 'SCIENTIFIC') return;

    calculator.input(btn.dataset.type, btn.dataset.value);
  });
});