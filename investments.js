/* ============================================
   INVESTMENT MODULE JAVASCRIPT
   ============================================ */

// Global variables
let allInvestments = [];
let currentReportTab = 'purchaseReport';
let currentReportType = '';
let investmentToRollover = null;

// ============================================
// INITIALIZATION
// ============================================

function initInvestmentModule() {
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('investmentDate');
  if (dateField) dateField.value = today;

  // Setup bank select change handler
  const bankSelect = document.getElementById('bankName');
  if (bankSelect) {
    bankSelect.addEventListener('change', handleBankChange);
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeInvestmentModal();
    }
  });
}

function initInvestmentReportModule() {
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = getStartOfYear();
  
  const purchaseFromDate = document.getElementById('purchaseFromDate');
  const purchaseToDate = document.getElementById('purchaseToDate');
  const fullReportToDate = document.getElementById('fullReportToDate');
  const interestFromDate = document.getElementById('interestFromDate');
  const interestToDate = document.getElementById('interestToDate');
  
  if (purchaseFromDate) purchaseFromDate.value = startOfYear;
  if (purchaseToDate) purchaseToDate.value = today;
  if (fullReportToDate) fullReportToDate.value = today;
  if (interestFromDate) interestFromDate.value = startOfYear;
  if (interestToDate) interestToDate.value = today;

  loadPurchaseReport();

  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const portal = document.getElementById('investmentActionPortal');
    if (portal && portal.style.display === 'block') {
      if (!portal.contains(event.target) && !event.target.classList.contains('action-btn')) {
        closeInvestmentActionDropdown();
      }
    }
  });

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('rolloverModal');
    if (modal && event.target === modal) {
      closeRolloverModal();
    }
  });
}

function getStartOfYear() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return startOfYear.toISOString().split('T')[0];
}

// ============================================
// INVESTMENT TYPE & BANK HANDLERS
// ============================================

function handleInvestmentTypeChange() {
  const investmentType = document.getElementById('investmentType').value;
  const codeField = document.getElementById('investmentCode');
  const addNewFields = document.getElementById('addNewInvestmentTypeFields');

  if (investmentType === 'add-new') {
    addNewFields.style.display = 'block';
    codeField.value = '';
  } else {
    addNewFields.style.display = 'none';
    document.getElementById('newInvestmentType').value = '';
    
    if (investmentType) {
      generateInvestmentCode(investmentType);
    } else {
      codeField.value = '';
    }
  }
}

function handleBankChange() {
  const bankName = document.getElementById('bankName').value;
  const addNewFields = document.getElementById('addNewBankFields');

  if (bankName === 'add-new') {
    addNewFields.style.display = 'block';
  } else {
    addNewFields.style.display = 'none';
    document.getElementById('newBankName').value = '';
  }
}

function generateInvestmentCode(investmentType) {
  callGAS('generateInvestmentCode', { investmentType: investmentType })
    .then(response => {
      const field = document.getElementById('investmentCode');
      if (field && response) {
        field.value = response;
      }
    })
    .catch(error => {
      console.error('Error generating investment code:', error);
      showInvestmentMessage('Error generating investment code: ' + (error.message || error), 'error');
    });
}

// ============================================
// CALCULATIONS
// ============================================

function calculateMaturityDate() {
  const investmentDate = document.getElementById('investmentDate').value;
  const duration = parseInt(document.getElementById('duration').value) || 0;

  if (!investmentDate || duration <= 0) {
    document.getElementById('maturityDate').value = '';
    return;
  }

  const startDate = new Date(investmentDate);
  const maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
  
  const year = maturityDate.getFullYear();
  const month = String(maturityDate.getMonth() + 1).padStart(2, '0');
  const day = String(maturityDate.getDate()).padStart(2, '0');
  
  document.getElementById('maturityDate').value = `${year}-${month}-${day}`;
  calculateMaturityAmount();
}

function calculateMaturityAmount() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
  const duration = parseInt(document.getElementById('duration').value) || 0;

  if (amount <= 0 || interestRate < 0 || duration <= 0) {
    document.getElementById('interestAmount').value = '0.00';
    document.getElementById('maturityAmount').value = '0.00';
    return;
  }

  // Simple interest: I = P * R * T / 100
  const timeInYears = duration / 365;
  const interestAmount = (amount * interestRate * timeInYears) / 100;
  const maturityAmount = amount + interestAmount;

  document.getElementById('interestAmount').value = formatCurrency(interestAmount);
  document.getElementById('maturityAmount').value = formatCurrency(maturityAmount);
}

// ============================================
// SUBMIT INVESTMENT
// ============================================

function submitNewInvestment() {
  let investmentType = document.getElementById('investmentType').value;
  const investmentCode = document.getElementById('investmentCode').value;
  let bankName = document.getElementById('bankName').value;
  const amount = document.getElementById('amount').value;
  const interestRate = document.getElementById('interestRate').value;
  const duration = document.getElementById('duration').value;
  const investmentDate = document.getElementById('investmentDate').value;
  const maturityDate = document.getElementById('maturityDate').value;
  const interestAmount = document.getElementById('interestAmount').value;
  const maturityAmount = document.getElementById('maturityAmount').value;

  // Validation
  if (!investmentType || investmentType === 'add-new') {
    if (investmentType === 'add-new') {
      const newType = document.getElementById('newInvestmentType').value;
      if (!newType || newType.trim() === '') {
        showInvestmentMessage('Please enter a new investment type', 'error');
        return;
      }
      investmentType = newType;
    } else {
      showInvestmentMessage('Please select an investment type', 'error');
      return;
    }
  }

  if (!investmentCode || investmentCode.trim() === '') {
    showInvestmentMessage('Please generate an investment code', 'error');
    return;
  }

  if (!bankName || bankName === 'add-new') {
    if (bankName === 'add-new') {
      const newBank = document.getElementById('newBankName').value;
      if (!newBank || newBank.trim() === '') {
        showInvestmentMessage('Please enter a new bank name', 'error');
        return;
      }
      bankName = newBank;
    } else {
      showInvestmentMessage('Please select a bank', 'error');
      return;
    }
  }

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    showInvestmentMessage('Please enter a valid amount', 'error');
    return;
  }

  if (!interestRate || isNaN(interestRate) || parseFloat(interestRate) < 0) {
    showInvestmentMessage('Please enter a valid interest rate', 'error');
    return;
  }

  if (!duration || isNaN(duration) || parseInt(duration) <= 0) {
    showInvestmentMessage('Please enter a valid duration', 'error');
    return;
  }

  if (!investmentDate) {
    showInvestmentMessage('Please select an investment date', 'error');
    return;
  }

  if (!maturityDate) {
    showInvestmentMessage('Please enter a maturity date', 'error');
    return;
  }

  showInvestmentLoadingModal('Adding Investment...');

  const formData = {
    investmentType: investmentType.trim(),
    investmentCode: investmentCode.trim(),
    bankName: bankName.trim(),
    amount: parseFloat(amount),
    interestRate: parseFloat(interestRate),
    duration: parseInt(duration),
    investmentDate: investmentDate,
    maturityDate: maturityDate,
    interestAmount: parseFloat(interestAmount),
    maturityAmount: parseFloat(maturityAmount)
  };

  callGAS('addNewInvestment', { formData: JSON.stringify(formData) })
    .then(response => {
      hideInvestmentLoadingModal();
      if (response && !response.error) {
        showInvestmentMessage('✓ Investment added successfully!', 'success');
        setTimeout(() => {
          document.getElementById('newInvestmentForm').reset();
          const today = new Date().toISOString().split('T')[0];
          document.getElementById('investmentDate').value = today;
          document.getElementById('investmentCode').value = '';
          document.getElementById('interestAmount').value = '0.00';
          document.getElementById('maturityAmount').value = '0.00';
          document.getElementById('investmentType').value = '';
          document.getElementById('bankName').value = '';
          document.getElementById('addNewInvestmentTypeFields').style.display = 'none';
          document.getElementById('addNewBankFields').style.display = 'none';
        }, 1500);
      } else {
        showInvestmentMessage('Error adding investment: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      hideInvestmentLoadingModal();
      showInvestmentMessage('Error adding investment: ' + (error.message || error), 'error');
    });
}

// ============================================
// REPORT FUNCTIONS
// ============================================

function switchInvestmentReportTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  event.target.closest('.tab-btn').classList.add('active');

  const purchaseControls = document.getElementById('purchaseControls');
  const fullReportControls = document.getElementById('fullReportControls');
  const interestControls = document.getElementById('interestControls');
  const maturedControls = document.getElementById('maturedControls');

  if (tabName === 'purchaseReport') {
    purchaseControls.style.display = 'flex';
    fullReportControls.style.display = 'none';
    interestControls.style.display = 'none';
    maturedControls.style.display = 'none';
    loadPurchaseReport();
  } else if (tabName === 'fullReport') {
    purchaseControls.style.display = 'none';
    fullReportControls.style.display = 'flex';
    interestControls.style.display = 'none';
    maturedControls.style.display = 'none';
    document.getElementById('reportTypeSelect').value = '';
    document.getElementById('fullReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select a report type</p>';
  } else if (tabName === 'interestReport') {
    purchaseControls.style.display = 'none';
    fullReportControls.style.display = 'none';
    interestControls.style.display = 'flex';
    maturedControls.style.display = 'none';
    loadInterestReport();
  } else if (tabName === 'maturedReport') {
    purchaseControls.style.display = 'none';
    fullReportControls.style.display = 'none';
    interestControls.style.display = 'none';
    maturedControls.style.display = 'flex';
    loadMaturedInvestments();
  }
}

function loadPurchaseReport() {
  const fromDate = document.getElementById('purchaseFromDate').value;
  const toDate = document.getElementById('purchaseToDate').value;

  if (!fromDate || !toDate) {
    showInvestmentEmptyState('purchaseReportBody', 'Please select date range', 7);
    return;
  }

  showInvestmentLoadingSpinner('purchaseReportBody', 7);
  
  callGAS('getInvestmentsByDateRange', { fromDate: fromDate, toDate: toDate })
    .then(response => {
      if (response && !response.error) {
        allInvestments = response;
        renderPurchaseReportTable(response);
      } else {
        showInvestmentEmptyState('purchaseReportBody', 'Error loading report', 7);
      }
    })
    .catch(error => {
      console.error('Error loading purchase report:', error);
      showInvestmentEmptyState('purchaseReportBody', 'Error loading report', 7);
    });
}

function renderPurchaseReportTable(data) {
  const tbody = document.getElementById('purchaseReportBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    showInvestmentEmptyState('purchaseReportBody', 'No investments found', 7);
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr>
      <td>${escapeHtml(row.investmentCode || '')}</td>
      <td>${escapeHtml(row.bankName || '')}</td>
      <td>${escapeHtml(row.investmentType || '')}</td>
      <td>${formatCurrency(row.amount)}</td>
      <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
      <td>${row.duration || 0}</td>
      <td>${row.investmentDate || ''}</td>
     </>
  `).join('');
}

function handleReportTypeChange() {
  const reportType = document.getElementById('reportTypeSelect').value;
  if (!reportType) {
    document.getElementById('fullReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select a report type</p>';
    return;
  }
  currentReportType = reportType;
  loadFullInvestmentReport();
}

function loadFullInvestmentReport() {
  const toDate = document.getElementById('fullReportToDate').value;
  const reportType = document.getElementById('reportTypeSelect').value;

  if (!toDate || !reportType) {
    document.getElementById('fullReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select date and report type</p>';
    return;
  }

  showInvestmentLoadingSpinner('fullReportContainer');

  const startOfYear = getStartOfYear();

  callGAS('getInvestmentsByDateRange', { fromDate: startOfYear, toDate: toDate })
    .then(response => {
      if (response && !response.error) {
        allInvestments = response;
        if (reportType === 'byType') {
          renderByInvestmentType(response, toDate);
        } else if (reportType === 'byBank') {
          renderByBank(response, toDate);
        } else if (reportType === 'byDuration') {
          renderByDuration(response, toDate);
        }
      } else {
        document.getElementById('fullReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
      }
    })
    .catch(error => {
      console.error('Error loading full report:', error);
      document.getElementById('fullReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
    });
}

function renderByInvestmentType(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  const toDateObj = new Date(toDate);

  const grouped = {};
  data.forEach(item => {
    const maturityTime = new Date(item.maturityDate).getTime();
    if (maturityTime > toDateObj.getTime()) {
      if (!grouped[item.investmentType]) {
        grouped[item.investmentType] = [];
      }
      grouped[item.investmentType].push(item);
    }
  });

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found</p>';
    return;
  }

  let grandTotalAmount = 0;
  let grandTotalInterest = 0;
  let grandTotalMaturityAmount = 0;
  let grandTotalCurrentValue = 0;

  let html = '';
  Object.keys(grouped).forEach(type => {
    const items = grouped[type];
    
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalMaturityAmount = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const interestAmount = parseFloat(row.interestAmount) || 0;
      const maturityAmount = parseFloat(row.maturityAmount) || 0;
      const investDate = new Date(row.investmentDate);
      const maturityDate = new Date(row.maturityDate);
      
      const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
      const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
      const rate = parseFloat(row.interestRate) || 0;
      const dailyRate = (amount * (rate / 100)) / 365;
      const accruedToDate = dailyRate * daysToDate;
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalInterest += interestAmount;
      subtotalMaturityAmount += maturityAmount;
      subtotalCurrentValue += currentValue;
    });

    grandTotalAmount += subtotalAmount;
    grandTotalInterest += subtotalInterest;
    grandTotalMaturityAmount += subtotalMaturityAmount;
    grandTotalCurrentValue += subtotalCurrentValue;

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(type)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Bank Name</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Interest Amount</th>
                <th>Maturity Date</th>
                <th>Maturity Amount</th>
                <th>Current Value</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const interestAmount = parseFloat(row.interestAmount) || 0;
                const maturityAmount = parseFloat(row.maturityAmount) || 0;
                const investDate = new Date(row.investmentDate);
                const maturityDate = new Date(row.maturityDate);
                const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
                const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
                const rate = parseFloat(row.interestRate) || 0;
                const dailyRate = (amount * (rate / 100)) / 365;
                const accruedToDate = dailyRate * daysToDate;
                const currentValue = amount + accruedToDate;
                
                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.bankName || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(maturityAmount)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right;">${escapeHtml(type)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td></td><td></td><td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  html += `
    <div class="grouped-report grand-total-report">
      <div class="group-table-wrapper">
        <table class="group-table">
          <tbody>
            <tr class="grand-total-row">
              <td colspan="2" style="text-align: right; font-weight: 700;">Grand Total:</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalAmount)}</td>
              <td></td><td></td><td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalInterest)}</td>
              <td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalMaturityAmount)}</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalCurrentValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderByBank(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  const toDateObj = new Date(toDate);

  const grouped = {};
  data.forEach(item => {
    const maturityTime = new Date(item.maturityDate).getTime();
    if (maturityTime > toDateObj.getTime()) {
      if (!grouped[item.bankName]) {
        grouped[item.bankName] = [];
      }
      grouped[item.bankName].push(item);
    }
  });

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found</p>';
    return;
  }

  let html = '';
  Object.keys(grouped).sort().forEach(bank => {
    const items = grouped[bank];
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalMaturityAmount = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const interestAmount = parseFloat(row.interestAmount) || 0;
      const maturityAmount = parseFloat(row.maturityAmount) || 0;
      const investDate = new Date(row.investmentDate);
      const maturityDate = new Date(row.maturityDate);
      const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
      const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
      const rate = parseFloat(row.interestRate) || 0;
      const dailyRate = (amount * (rate / 100)) / 365;
      const accruedToDate = dailyRate * daysToDate;
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalInterest += interestAmount;
      subtotalMaturityAmount += maturityAmount;
      subtotalCurrentValue += currentValue;
    });

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(bank)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Investment Type</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Interest Amount</th>
                <th>Maturity Date</th>
                <th>Maturity Amount</th>
                <th>Current Value</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const interestAmount = parseFloat(row.interestAmount) || 0;
                const maturityAmount = parseFloat(row.maturityAmount) || 0;
                const investDate = new Date(row.investmentDate);
                const maturityDate = new Date(row.maturityDate);
                const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
                const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
                const rate = parseFloat(row.interestRate) || 0;
                const dailyRate = (amount * (rate / 100)) / 365;
                const accruedToDate = dailyRate * daysToDate;
                const currentValue = amount + accruedToDate;
                
                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.investmentType || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(maturityAmount)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right;">${escapeHtml(bank)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td></td><td></td><td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderByDuration(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  const toDateObj = new Date(toDate);

  const grouped = {
    '0 – 91 Days': [],
    '92 – 182 Days': [],
    '183 – 365 Days': [],
    'Above 365 Days': []
  };

  data.forEach(item => {
    const maturityTime = new Date(item.maturityDate).getTime();
    if (maturityTime > toDateObj.getTime()) {
      const duration = item.duration || 0;
      if (duration <= 91) grouped['0 – 91 Days'].push(item);
      else if (duration <= 182) grouped['92 – 182 Days'].push(item);
      else if (duration <= 365) grouped['183 – 365 Days'].push(item);
      else grouped['Above 365 Days'].push(item);
    }
  });

  let hasData = false;
  Object.values(grouped).forEach(group => { if (group.length > 0) hasData = true; });

  if (!hasData) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found</p>';
    return;
  }

  let html = '';
  Object.keys(grouped).forEach(durationRange => {
    if (grouped[durationRange].length > 0) {
      const items = grouped[durationRange];
      let subtotalAmount = 0;
      let subtotalInterest = 0;
      let subtotalMaturityAmount = 0;
      let subtotalCurrentValue = 0;

      items.forEach(row => {
        const amount = parseFloat(row.amount) || 0;
        const interestAmount = parseFloat(row.interestAmount) || 0;
        const maturityAmount = parseFloat(row.maturityAmount) || 0;
        const investDate = new Date(row.investmentDate);
        const maturityDate = new Date(row.maturityDate);
        const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
        const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
        const rate = parseFloat(row.interestRate) || 0;
        const dailyRate = (amount * (rate / 100)) / 365;
        const accruedToDate = dailyRate * daysToDate;
        const currentValue = amount + accruedToDate;

        subtotalAmount += amount;
        subtotalInterest += interestAmount;
        subtotalMaturityAmount += maturityAmount;
        subtotalCurrentValue += currentValue;
      });

      html += `
        <div class="grouped-report">
          <div class="group-title">${durationRange}</div>
          <div class="group-table-wrapper">
            <table class="group-table">
              <thead>
                <tr>
                  <th>Investment Code</th>
                  <th>Bank Name</th>
                  <th>Investment Type</th>
                  <th>Amount (GHc)</th>
                  <th>Interest Rate (%)</th>
                  <th>Duration (Days)</th>
                  <th>Investment Date</th>
                  <th>Interest Amount</th>
                  <th>Maturity Date</th>
                  <th>Maturity Amount</th>
                  <th>Current Value</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(row => {
                  const amount = parseFloat(row.amount) || 0;
                  const interestAmount = parseFloat(row.interestAmount) || 0;
                  const maturityAmount = parseFloat(row.maturityAmount) || 0;
                  const investDate = new Date(row.investmentDate);
                  const maturityDate = new Date(row.maturityDate);
                  const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
                  const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
                  const rate = parseFloat(row.interestRate) || 0;
                  const dailyRate = (amount * (rate / 100)) / 365;
                  const accruedToDate = dailyRate * daysToDate;
                  const currentValue = amount + accruedToDate;
                  
                  return `
                    <tr>
                      <td>${escapeHtml(row.investmentCode || '')}</td>
                      <td>${escapeHtml(row.bankName || '')}</td>
                      <td>${escapeHtml(row.investmentType || '')}</td>
                      <td>${formatCurrency(amount)}</td>
                      <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
                      <td>${row.duration || 0}</td>
                      <td>${row.investmentDate || ''}</td>
                      <td>${formatCurrency(interestAmount)}</td>
                      <td>${row.maturityDate || ''}</td>
                      <td>${formatCurrency(maturityAmount)}</td>
                      <td>${formatCurrency(currentValue)}</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right;">${durationRange} Subtotal:</td>
                  <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                  <td></td><td></td><td></td>
                  <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                  <td></td>
                  <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                  <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  });

  container.innerHTML = html;
}

function loadInterestReport() {
  const fromDate = document.getElementById('interestFromDate').value;
  const toDate = document.getElementById('interestToDate').value;

  if (!fromDate || !toDate) {
    document.getElementById('interestReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select date range</p>';
    return;
  }

  showInvestmentLoadingSpinner('interestReportContainer');

  const startOfYear = getStartOfYear();

  callGAS('getInvestmentsByDateRange', { fromDate: startOfYear, toDate: toDate })
    .then(response => {
      if (response && !response.error) {
        renderInterestReport(response, fromDate, toDate);
      } else {
        document.getElementById('interestReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
      }
    })
    .catch(error => {
      console.error('Error loading interest report:', error);
      document.getElementById('interestReportContainer').innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
    });
}

function renderInterestReport(data, fromDate, toDate) {
  const container = document.getElementById('interestReportContainer');
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);

  const activeInvestments = data.filter(item => {
    const maturityDate = new Date(item.maturityDate);
    return maturityDate > toDateObj;
  });

  if (activeInvestments.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found</p>';
    return;
  }

  const grouped = {};
  activeInvestments.forEach(item => {
    if (!grouped[item.investmentType]) {
      grouped[item.investmentType] = [];
    }
    grouped[item.investmentType].push(item);
  });

  let html = '';
  Object.keys(grouped).forEach(type => {
    const items = grouped[type];
    let subtotalAmount = 0;
    let subtotalAccruedMonthly = 0;
    let subtotalAccruedToDate = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const rate = parseFloat(row.interestRate) || 0;
      const investDate = new Date(row.investmentDate);
      const maturityDate = new Date(row.maturityDate);
      const interestAmount = parseFloat(row.interestAmount) || 0;

      const daysInRange = calculateDaysInRange(investDate, maturityDate, fromDateObj, toDateObj);
      const dailyRate = (amount * (rate / 100)) / 365;
      const accruedMonthly = dailyRate * daysInRange;

      const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
      const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
      const accruedToDate = dailyRate * daysToDate;
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalAccruedMonthly += accruedMonthly;
      subtotalAccruedToDate += accruedToDate;
      subtotalCurrentValue += currentValue;
    });

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(type)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Bank Name</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Maturity Date</th>
                <th>Interest Amount</th>
                <th>Accrued Monthly Interest</th>
                <th>Accrued Interest To Date</th>
                <th>Current Value</th>
               </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const rate = parseFloat(row.interestRate) || 0;
                const investDate = new Date(row.investmentDate);
                const maturityDate = new Date(row.maturityDate);
                const interestAmount = parseFloat(row.interestAmount) || 0;

                const daysInRange = calculateDaysInRange(investDate, maturityDate, fromDateObj, toDateObj);
                const dailyRate = (amount * (rate / 100)) / 365;
                const accruedMonthly = dailyRate * daysInRange;

                const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
                const daysToDate = calculateDaysInRange(investDate, effectiveToDate);
                const accruedToDate = dailyRate * daysToDate;
                const currentValue = amount + accruedToDate;

                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.bankName || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${rate ? rate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${formatCurrency(accruedMonthly)}</td>
                    <td>${formatCurrency(accruedToDate)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right;">${escapeHtml(type)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td></td><td></td><td></td><td></td><td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalAccruedMonthly)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAccruedToDate)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function loadMaturedInvestments() {
  const today = new Date().toISOString().split('T')[0];
  showInvestmentLoadingSpinner('maturedReportBody', 10);

  callGAS('getMaturedInvestments', { toDate: today })
    .then(response => {
      if (response && !response.error && response.length > 0) {
        renderMaturedInvestmentsTable(response);
      } else {
        showInvestmentEmptyState('maturedReportBody', 'No matured investments found', 10);
      }
    })
    .catch(error => {
      console.error('Error loading matured investments:', error);
      showInvestmentEmptyState('maturedReportBody', 'Error loading matured investments', 10);
    });
}

function renderMaturedInvestmentsTable(data) {
  const tbody = document.getElementById('maturedReportBody');
  if (!tbody) return;

  allInvestments = data;

  tbody.innerHTML = data.map(row => `
    <tr>
      <td>${escapeHtml(row.investmentCode || '')}</td>
      <td>${escapeHtml(row.bankName || '')}</td>
      <td>${escapeHtml(row.investmentType || '')}</td>
      <td>${formatCurrency(row.amount)}</td>
      <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
      <td>${row.duration || 0}</td>
      <td>${row.investmentDate || ''}</td>
      <td>${row.maturityDate || ''}</td>
      <td>${formatCurrency(row.maturityAmount)}</td>
      <td>
        <button class="action-btn" onclick="openMaturedDropdown(event, '${escapeHtml(row.investmentCode)}')">
          <i class="fas fa-ellipsis-v"></i> Action
        </button>
      </td>
    </tr>
  `).join('');
}

function openMaturedDropdown(event, investmentCode) {
  closeInvestmentActionDropdown();

  const rect = event.target.closest('button').getBoundingClientRect();
  const portal = document.getElementById('investmentActionPortal');

  portal.innerHTML = `
    <div class="action-dropdown-content">
      <button class="dropdown-item" onclick="openRolloverModal('${investmentCode}')">
        <i class="fas fa-redo"></i> Rollover
      </button>
      <button class="dropdown-item" onclick="removeMaturedInvestment('${investmentCode}')">
        <i class="fas fa-trash-alt"></i> Remove
      </button>
    </div>
  `;

  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';

  event.stopPropagation();
}

function closeInvestmentActionDropdown() {
  const portal = document.getElementById('investmentActionPortal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
}

function openRolloverModal(investmentCode) {
  closeInvestmentActionDropdown();
  
  const investment = allInvestments.find(inv => inv.investmentCode === investmentCode);
  if (!investment) {
    showInvestmentMessage('Investment not found', 'error');
    return;
  }

  investmentToRollover = investment;

  document.getElementById('rolloverInvestmentType').value = investment.investmentType;
  document.getElementById('rolloverBankName').value = investment.bankName;
  document.getElementById('rolloverAmount').value = investment.maturityAmount;
  document.getElementById('rolloverInterestRate').value = investment.interestRate;
  document.getElementById('rolloverDuration').value = investment.duration;

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('rolloverInvestmentDate').value = today;

  generateRolloverInvestmentCode(investment.investmentType);
  calculateRolloverMaturityDate();

  document.getElementById('rolloverModal').style.display = 'flex';
}

function closeRolloverModal() {
  document.getElementById('rolloverModal').style.display = 'none';
  investmentToRollover = null;
}

function generateRolloverInvestmentCode(investmentType) {
  callGAS('generateInvestmentCode', { investmentType: investmentType })
    .then(response => {
      document.getElementById('rolloverInvestmentCode').value = response || '';
    })
    .catch(error => {
      console.error('Error generating code:', error);
    });
}

function handleRolloverInvestmentTypeChange() {
  const investmentType = document.getElementById('rolloverInvestmentType').value;
  if (investmentType) {
    generateRolloverInvestmentCode(investmentType);
  }
}

function calculateRolloverMaturityDate() {
  const investmentDate = document.getElementById('rolloverInvestmentDate').value;
  const duration = parseInt(document.getElementById('rolloverDuration').value) || 0;

  if (!investmentDate || duration <= 0) {
    document.getElementById('rolloverMaturityDate').value = '';
    return;
  }

  const startDate = new Date(investmentDate);
  const maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

  const year = maturityDate.getFullYear();
  const month = String(maturityDate.getMonth() + 1).padStart(2, '0');
  const day = String(maturityDate.getDate()).padStart(2, '0');

  document.getElementById('rolloverMaturityDate').value = `${year}-${month}-${day}`;
  calculateRolloverMaturityAmount();
}

function calculateRolloverMaturityAmount() {
  const amount = parseFloat(document.getElementById('rolloverAmount').value) || 0;
  const interestRate = parseFloat(document.getElementById('rolloverInterestRate').value) || 0;
  const duration = parseInt(document.getElementById('rolloverDuration').value) || 0;

  if (amount <= 0 || interestRate < 0 || duration <= 0) {
    document.getElementById('rolloverInterestAmount').value = '0.00';
    document.getElementById('rolloverMaturityAmount').value = '0.00';
    return;
  }

  const timeInYears = duration / 365;
  const interestAmount = (amount * interestRate * timeInYears) / 100;
  const maturityAmount = amount + interestAmount;

  document.getElementById('rolloverInterestAmount').value = formatCurrency(interestAmount);
  document.getElementById('rolloverMaturityAmount').value = formatCurrency(maturityAmount);
}

function submitRolloverInvestment() {
  showInvestmentMessage('Rollover investment submitted successfully!', 'success');
  closeRolloverModal();
  loadMaturedInvestments();
}

function removeMaturedInvestment(investmentCode) {
  closeInvestmentActionDropdown();
  
  if (confirm(`Are you sure you want to remove investment ${investmentCode}?`)) {
    showInvestmentMessage('Investment removed successfully!', 'success');
    loadMaturedInvestments();
  }
}

function calculateDaysInRange(startDate, endDate, fromDate = null, toDate = null) {
  let effectiveStart = startDate;
  let effectiveEnd = endDate;
  
  if (fromDate && fromDate > effectiveStart) {
    effectiveStart = fromDate;
  }
  if (toDate && toDate < effectiveEnd) {
    effectiveEnd = toDate;
  }
  
  if (effectiveStart >= effectiveEnd) return 0;
  
  const timeDiff = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showInvestmentMessage(message, type) {
  const modal = document.getElementById('messageModal');
  const messageDiv = document.getElementById('modalMessage');

  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message'
  };

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
}

function closeInvestmentModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showInvestmentLoadingModal(message = 'Processing...') {
  let modal = document.getElementById('investmentLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'investmentLoadingModal';
    modal.className = 'investment-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideInvestmentLoadingModal() {
  const modal = document.getElementById('investmentLoadingModal');
  if (modal) modal.style.display = 'none';
}

function showInvestmentEmptyState(elementId, message, colSpan) {
  const element = document.getElementById(elementId);
  if (element && element.tagName === 'TBODY') {
    element.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="loading-cell">
          <i class="fas fa-folder-open"></i>
          <p>${message}</p>
        </td>
      </tr>
    `;
  } else {
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = `<p style="text-align: center; color: #a0aec0; padding: 30px;">${message}</p>`;
    }
  }
}

function showInvestmentLoadingSpinner(elementId, colSpan) {
  const element = document.getElementById(elementId);
  if (element && element.tagName === 'TBODY') {
    element.innerHTML = `<tr><td colspan="${colSpan}" class="loading-cell">Loading...</td></tr>`;
  } else {
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = `<p style="text-align: center; color: #a0aec0; padding: 30px;">Loading...</p>`;
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Export for global use
window.initInvestmentModule = initInvestmentModule;
window.initInvestmentReportModule = initInvestmentReportModule;
window.handleInvestmentTypeChange = handleInvestmentTypeChange;
window.calculateMaturityDate = calculateMaturityDate;
window.calculateMaturityAmount = calculateMaturityAmount;
window.submitNewInvestment = submitNewInvestment;
window.switchInvestmentReportTab = switchInvestmentReportTab;
window.handleReportTypeChange = handleReportTypeChange;
window.loadPurchaseReport = loadPurchaseReport;
window.loadFullInvestmentReport = loadFullInvestmentReport;
window.loadInterestReport = loadInterestReport;
window.openMaturedDropdown = openMaturedDropdown;
window.openRolloverModal = openRolloverModal;
window.closeRolloverModal = closeRolloverModal;
window.handleRolloverInvestmentTypeChange = handleRolloverInvestmentTypeChange;
window.calculateRolloverMaturityDate = calculateRolloverMaturityDate;
window.calculateRolloverMaturityAmount = calculateRolloverMaturityAmount;
window.submitRolloverInvestment = submitRolloverInvestment;
window.removeMaturedInvestment = removeMaturedInvestment;
window.closeInvestmentModal = closeInvestmentModal;
