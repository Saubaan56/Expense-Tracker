 // --- State ---
  // Each entry: { id, desc, amount, type: 'expense'|'income', category, date }
  let entries = [];

  function loadEntries() {
    try {
      const raw = localStorage.getItem('ledger-entries');
      entries = raw ? JSON.parse(raw) : [];
    } catch (e) {
      entries = [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem('ledger-entries', JSON.stringify(entries));
    } catch (e) {
      console.error('Could not save entries', e);
    }
  }

  function formatMoney(n) {
    const sign = n < 0 ? '-' : '';
    return sign + '₹' + Math.abs(n).toFixed(2);
  }

  function render() {
    const list = document.getElementById('expense-list');
    const emptyMsg = document.getElementById('empty-msg');
    const filterValue = document.getElementById('category-filter').value;
    list.innerHTML = '';

    // Apply the category filter first, then sort newest first
    const filtered = filterValue === 'All'
      ? entries
      : entries.filter(e => e.category === filterValue);

    const sorted = [...filtered].sort((a, b) => b.id - a.id);

    if (entries.length === 0) {
      emptyMsg.textContent = 'No entries yet — add your first one above.';
      emptyMsg.style.display = 'block';
    } else if (sorted.length === 0) {
      emptyMsg.textContent = 'No entries in this category.';
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
    }

    for (const entry of sorted) {
      const li = document.createElement('li');

      const main = document.createElement('div');
      main.className = 'item-main';

      const desc = document.createElement('div');
      desc.className = 'item-desc';
      desc.textContent = entry.desc;

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      meta.textContent = entry.category + ' · ' + entry.date;

      main.appendChild(desc);
      main.appendChild(meta);

      const amount = document.createElement('div');
      amount.className = 'item-amount ' + entry.type;
      const signedAmount = entry.type === 'expense' ? -entry.amount : entry.amount;
      amount.textContent = formatMoney(signedAmount);

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete this entry';
      delBtn.addEventListener('click', () => deleteEntry(entry.id));

      li.appendChild(main);
      li.appendChild(amount);
      li.appendChild(delBtn);
      list.appendChild(li);
    }

    updateBalance();
    renderBudget();
  }

  // --- Budget mode (optional, separate from balance) ---
  let budget = null; // null means the person hasn't opted in

  function loadBudget() {
    const raw = localStorage.getItem('ledger-budget');
    budget = raw !== null ? parseFloat(raw) : null;
  }

  function saveBudget(value) {
    budget = value;
    localStorage.setItem('ledger-budget', String(value));
  }

  function clearBudget() {
    budget = null;
    localStorage.removeItem('ledger-budget');
  }

  function renderBudget() {
    const card = document.getElementById('budget-card');
    const setup = document.getElementById('budget-setup');

    if (budget === null) {
      card.style.display = 'none';
      setup.style.display = 'block';
      return;
    }

    setup.style.display = 'none';
    card.style.display = 'block';

    // Spending against budget only counts expenses — income doesn't refill it
    const spent = entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    const remaining = budget - spent;

    document.getElementById('budget-total').textContent = formatMoney(budget);
    document.getElementById('budget-spent').textContent = formatMoney(spent);
    const remainingEl = document.getElementById('budget-remaining');
    remainingEl.textContent = formatMoney(remaining);
    remainingEl.classList.toggle('negative', remaining < 0);
  }

  function updateBalance() {
    const total = entries.reduce((sum, e) => {
      return sum + (e.type === 'expense' ? -e.amount : e.amount);
    }, 0);

    const balanceEl = document.getElementById('balance');
    balanceEl.textContent = formatMoney(total);
    balanceEl.classList.toggle('negative', total < 0);
  }

  function addEntry(desc, amount, type, category) {
    entries.push({
      id: Date.now(),
      desc: desc,
      amount: amount,
      type: type,
      category: category,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            + ' · ' + new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    });
    saveEntries();
    render();
  }

  function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id);
    saveEntries();
    render();
  }

  const categoryInput = document.getElementById('category');

  document.getElementById('expense-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const descInput = document.getElementById('desc');
    const amountInput = document.getElementById('amount');
    const typeInput = document.getElementById('type');

    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const formError = document.getElementById('form-error');
    formError.style.display = 'none';

    // Basic validation: no empty description, no negative or zero amounts
    if (!desc || isNaN(amount) || amount <= 0) {
      formError.textContent = 'Enter a description and a positive amount.';
      formError.style.display = 'block';
      return;
    }

    addEntry(desc, amount, typeInput.value, categoryInput.value);

    descInput.value = '';
    amountInput.value = '';
    descInput.focus();
  });

  document.getElementById('category-filter').addEventListener('change', render);

  
  // --- Budget mode wiring ---
  const budgetForm = document.getElementById('budget-form');
  const budgetInput = document.getElementById('budget-input');

  function openBudgetForm(prefill) {
    budgetForm.style.display = 'grid';
    budgetInput.value = prefill !== undefined ? prefill : '';
    document.getElementById('budget-form-error').style.display = 'none';
    budgetInput.focus();
  }

  document.getElementById('show-budget-form-btn').addEventListener('click', function () {
    openBudgetForm();
  });

  document.getElementById('edit-budget-btn').addEventListener('click', function () {
    openBudgetForm(budget);
  });

  document.getElementById('remove-budget-btn').addEventListener('click', function () {
    // Only clears the budget number — logged entries are never touched
    clearBudget();
    budgetForm.style.display = 'none';
    renderBudget();
  });

  budgetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const value = parseFloat(budgetInput.value);
    const budgetError = document.getElementById('budget-form-error');
    if (isNaN(value) || value <= 0) {
      budgetError.textContent = 'Enter a positive starting budget.';
      budgetError.style.display = 'block';
      return;
    }
    budgetError.style.display = 'none';
    saveBudget(value);
    budgetForm.style.display = 'none';
    renderBudget();
  });

  loadEntries();
  loadBudget();
  render();