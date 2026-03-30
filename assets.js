/* ============================================
   FIXED ASSETS MODULE JAVASCRIPT
   ============================================ */

// Global variables
let assetPortalOpen = false;
let allDetailedAssets = [];
let currentAsOfDate = null;
let summaryFromDate = null;
let summaryToDate = null;

const ASSET_TYPES = [
  'Computers & Accessories',
  'Furniture And Fixtures',
  'Fittings',
  'Office Equipment',
  'Motor Vehicle',
  'Software'
];

// ============================================
// INITIALIZATION
// ============================================

function initAssetModule() {
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('dateOfPurchase');
  if (dateField) dateField.value = today;

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeAssetModal();
    }
  });
}

function initAssetRegisterModule() {
  const today = new Date().toISOString().split('T')[0];
  
  // Set initial date values
  const detailedToDate = document.getElementById('detailedToDate');
  const summaryFromDateEl = document.getElementById('summaryFromDate');
  const summaryToDateEl = document.getElementById('summaryToDate');
  
  if (detailedToDate) detailedToDate.value = today;
  if (summaryFromDateEl) summaryFromDateEl.value = today;
  if (summaryToDateEl) summaryToDateEl.value = today;
  
  currentAsOfDate = today;
  summaryFromDate = today;
  summaryToDate = today;
  
  loadDetailedRegister();

  window.addEventListener('click', function(event) {
    if (assetPortalOpen) {
      const portal = document.getElementById('assetActionPortal');
      if (portal && !portal.contains(event.target) && !event.target.classList.contains('action-btn')) {
        closeAssetActionDropdown();
      }
    }
  });
}

// ============================================
// ASSET CODE GENERATION
// ============================================

function handleAssetTypeChange() {
  const assetType = document.getElementById('assetType').value;
  const codeField = document.getElementById('assetCode');
  const depreciationInfo = document.getElementById('depreciationInfo');
  
  if (assetType) {
    // Show depreciation info
    depreciationInfo.style.display = 'block';
    calculateDepreciationInfo(assetType);
    
    if (assetType === 'Fittings' || assetType === 'Software') {
      codeField.value = 'N/A';
      codeField.readOnly = true;
    } else {
      codeField.value = 'Generating...';
      codeField.readOnly = true;
      generateAssetCode(assetType);
    }
  } else {
    depreciationInfo.style.display = 'none';
    codeField.value = '';
    codeField.readOnly = false;
  }
}

function calculateDepreciationInfo(assetType) {
  const cost = parseFloat(document.getElementById('assetCost').value) || 0;
  const purchaseDate = document.getElementById('dateOfPurchase').value;
  
  if (!cost || cost <= 0 || !purchaseDate) {
    // Show placeholder
    document.getElementById('lifeSpanDisplay').textContent = '—';
    document.getElementById('rateDisplay').textContent = '—';
    document.getElementById('monthlyDepDisplay').textContent = '—';
    document.getElementById('annualChargeDisplay').textContent = '—';
    document.getElementById('endOfLifeDisplay').textContent = '—';
    return;
  }
  
  // Get asset config
  const configs = {
    'Computers & Accessories': { lifeSpan: 3, rate: 33.33 },
    'Furniture and Fixtures': { lifeSpan: 3, rate: 33.33 },
    'Office Equipment': { lifeSpan: 3, rate: 33.33 },
    'Software': { lifeSpan: 3, rate: 33.33 },
    'Fittings': { lifeSpan: 5, rate: 20.00 },
    'Motor Vehicle': { lifeSpan: 5, rate: 20.00 }
  };
  
  const config = configs[assetType] || { lifeSpan: 3, rate: 33.33 };
  const annualCharge = (cost * config.rate) / 100;
  const monthlyDep = annualCharge / 12;
  
  // Calculate end of life span
  const purchase = new Date(purchaseDate);
  const endOfLife = new Date(purchase);
  endOfLife.setFullYear(purchase.getFullYear() + config.lifeSpan);
  
  document.getElementById('lifeSpanDisplay').textContent = config.lifeSpan + ' years';
  document.getElementById('rateDisplay').textContent = config.rate + '%';
  document.getElementById('monthlyDepDisplay').textContent = formatCurrency(monthlyDep);
  document.getElementById('annualChargeDisplay').textContent = formatCurrency(annualCharge);
  document.getElementById('endOfLifeDisplay').textContent = formatDateForDisplay(endOfLife);
}

function generateAssetCode(assetType) {
  callGAS('generateAssetCode', { assetType: assetType })
    .then(response => {
      const field = document.getElementById('assetCode');
      if (field) {
        field.value = response || '';
      }
    })
    .catch(error => {
      console.error('Error generating asset code:', error);
      document.getElementById('assetCode').value = '';
      showAssetMessage('Error generating asset code: ' + (error.message || error), 'error');
    });
}

// ============================================
// ASSET CRUD
// ============================================

function submitNewAsset() {
  const assetType = document.getElementById('assetType').value;
  const assetCode = document.getElementById('assetCode').value;
  const assetName = document.getElementById('assetName').value;
  const dateOfPurchase = document.getElementById('dateOfPurchase').value;
  const assetCost = document.getElementById('assetCost').value;
  const assetLocation = document.getElementById('assetLocation').value;

  // Validation
  if (!assetType) {
    showAssetMessage('Please select an asset type', 'error');
    return;
  }

  if (!assetName || assetName.trim() === '') {
    showAssetMessage('Please enter the name of the asset', 'error');
    return;
  }

  if (!dateOfPurchase) {
    showAssetMessage('Please select a date of purchase', 'error');
    return;
  }

  if (!assetCost || isNaN(assetCost) || assetCost <= 0) {
    showAssetMessage('Please enter a valid cost', 'error');
    return;
  }

  if (!assetLocation || assetLocation.trim() === '') {
    showAssetMessage('Please enter the asset location', 'error');
    return;
  }

  if ((assetType !== 'Fittings' && assetType !== 'Software') && (!assetCode || assetCode === 'Generating...')) {
    showAssetMessage('Please wait for the asset code to be generated', 'error');
    return;
  }

  showAssetLoadingModal('Adding Asset...');

  const formData = {
    assetType: assetType,
    assetCode: assetCode === 'N/A' ? '' : assetCode,
    assetName: assetName.trim(),
    dateOfPurchase: dateOfPurchase,
    assetCost: parseFloat(assetCost),
    location: assetLocation.trim(),
    status: 'Active'
  };

  callGAS('addNewAsset', { formData: JSON.stringify(formData) })
    .then(response => {
      hideAssetLoadingModal();
      if (response && !response.error) {
        showAssetMessage('✓ Asset added successfully!', 'success');
        setTimeout(() => {
          document.getElementById('newAssetForm').reset();
          const today = new Date().toISOString().split('T')[0];
          document.getElementById('dateOfPurchase').value = today;
          document.getElementById('assetCode').value = '';
          document.getElementById('assetType').value = '';
          document.getElementById('depreciationInfo').style.display = 'none';
        }, 1500);
      } else {
        showAssetMessage('Error adding asset: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .catch(error => {
      hideAssetLoadingModal();
      showAssetMessage('Error adding asset: ' + (error.message || error), 'error');
    });
}

// ============================================
// DETAILED REGISTER
// ============================================

function switchAssetRegisterTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  event.target.closest('.tab-btn').classList.add('active');

  // Toggle date range controls
  const detailedDateControl = document.getElementById('detailedDateControl');
  const summaryDateControl = document.getElementById('summaryDateControl');

  if (tabName === 'detailedRegister') {
    if (detailedDateControl) detailedDateControl.style.display = 'flex';
    if (summaryDateControl) summaryDateControl.style.display = 'none';
    loadDetailedRegister();
  } else if (tabName === 'summaryRegister') {
    if (detailedDateControl) detailedDateControl.style.display = 'none';
    if (summaryDateControl) summaryDateControl.style.display = 'flex';
    loadSummaryRegister();
  }
}

function loadDetailedRegister() {
  showAssetRegisterLoadingSpinner('detailedRegisterBody');
  
  callGAS('getDetailedRegister', {})
    .then(response => {
      if (response && !response.error) {
        allDetailedAssets = response;
        renderDetailedRegisterTable(response);
      } else {
        showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
      }
    })
    .catch(error => {
      console.error('Error loading detailed register:', error);
      showAssetRegisterEmptyState('detailedRegisterBody', 'Error loading asset register', 11);
    });
}

function recalculateAssetValues() {
  const asOfDateInput = document.getElementById('detailedToDate').value;
  if (!asOfDateInput) {
    renderDetailedRegisterTable(allDetailedAssets);
    return;
  }
  currentAsOfDate = asOfDateInput;
  renderDetailedRegisterTable(allDetailedAssets);
}

function renderDetailedRegisterTable(data) {
  const tbody = document.getElementById('detailedRegisterBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    showAssetRegisterEmptyState('detailedRegisterBody', 'No assets found', 11);
    return;
  }

  const rows = data.map(asset => {
    const monthlyDep = parseFloat(asset.annualCharge) / 12;
    const monthsElapsed = calculateMonthsElapsed(asset.purchaseDate, currentAsOfDate);
    const accumulatedDep = monthsElapsed * monthlyDep;
    const netBookValue = Math.max(0, asset.cost - accumulatedDep);
    
    return `
      <tr>
        <td>${escapeHtml(asset.name || '')}</td>
        <td>${escapeHtml(asset.type || '')}</td>
        <td>${escapeHtml(asset.code || '')}</td>
        <td>${escapeHtml(asset.location || '')}</td>
        <td>${asset.purchaseDate || ''}</td>
        <td>${formatCurrency(asset.cost)}</td>
        <td>${formatCurrency(asset.annualCharge)}</td>
        <td>${formatCurrency(monthlyDep)}</td>
        <td>${formatCurrency(accumulatedDep)}</td>
        <td>${formatCurrency(netBookValue)}</td>
        <td>
          <button class="action-btn" onclick="openAssetActionDropdown(event, '${escapeHtml(asset.name)}')">
            <i class="fas fa-ellipsis-v"></i> Action
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

// ============================================
// SUMMARY REGISTER
// ============================================

function loadSummaryRegister() {
  showAssetRegisterLoadingSpinner('summaryDetailsBody');
  
  summaryFromDate = document.getElementById('summaryFromDate').value;
  summaryToDate = document.getElementById('summaryToDate').value;

  if (!summaryFromDate || !summaryToDate) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select both FROM and TO dates', 9);
    return;
  }

  callGAS('getDetailedRegister', {})
    .then(response => {
      if (response && !response.error) {
        allDetailedAssets = response;
        renderSummaryTable();
      } else {
        showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register', 9);
      }
    })
    .catch(error => {
      console.error('Error loading summary register:', error);
      showAssetRegisterEmptyState('summaryDetailsBody', 'Error loading summary register', 9);
    });
}

function recalculateSummaryRegister() {
  const fromDateInput = document.getElementById('summaryFromDate').value;
  const toDateInput = document.getElementById('summaryToDate').value;

  if (!fromDateInput || !toDateInput) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'Please select both FROM and TO dates', 9);
    return;
  }

  summaryFromDate = fromDateInput;
  summaryToDate = toDateInput;
  loadSummaryRegister();
}

function renderSummaryTable() {
  const tbody = document.getElementById('summaryDetailsBody');
  if (!tbody) return;
  
  if (!allDetailedAssets || allDetailedAssets.length === 0) {
    showAssetRegisterEmptyState('summaryDetailsBody', 'No assets found', 9);
    return;
  }

  // Parse dates
  const fromDate = new Date(summaryFromDate);
  const toDate = new Date(summaryToDate);
  const fromYear = fromDate.getFullYear();
  const janFirstOfFromYear = new Date(fromYear, 0, 1);
  
  // Format dates for display
  const janFirstDisplay = formatDateDisplay(janFirstOfFromYear);
  const toDateDisplay = formatDateDisplay(toDate);
  const monthDisplay = formatMonthDisplay(toDate);

  // Initialize summary data by asset type
  let summaryData = {};
  ASSET_TYPES.forEach(type => {
    summaryData[type] = {
      costAtJan1: 0,
      additionsJanToTo: 0,
      costAtTo: 0,
      accDepAtJan1: 0,
      chargeJanToTo: 0,
      accDepAtTo: 0,
      nbvAtTo: 0,
      chargeForMonth: 0
    };
  });

  // Process each asset
  allDetailedAssets.forEach(asset => {
    const assetType = asset.type;
    if (!summaryData[assetType]) return;

    const purchaseDate = new Date(asset.purchaseDate);
    const cost = parseFloat(asset.cost) || 0;
    const annualCharge = parseFloat(asset.annualCharge) || 0;
    const monthlyCharge = annualCharge / 12;

    // COST AS AT 1st January of FROM year
    if (purchaseDate <= janFirstOfFromYear) {
      summaryData[assetType].costAtJan1 += cost;
    }

    // ADDITIONS (Jan 1 to TO date)
    if (purchaseDate > janFirstOfFromYear && purchaseDate <= toDate) {
      summaryData[assetType].additionsJanToTo += cost;
    }

    // COST AS AT TO date
    if (purchaseDate <= toDate) {
      summaryData[assetType].costAtTo += cost;
    }

    // ACCUMULATED DEPRECIATION at Jan 1
    if (purchaseDate <= janFirstOfFromYear) {
      const monthsUntilJan1 = calculateMonthsBetween(purchaseDate, janFirstOfFromYear);
      summaryData[assetType].accDepAtJan1 += monthlyCharge * monthsUntilJan1;
    }

    // CHARGE FOR YEAR/PERIOD (Jan 1 to TO)
    if (purchaseDate <= toDate) {
      let chargeStartDate = purchaseDate;
      if (chargeStartDate < janFirstOfFromYear) {
        chargeStartDate = janFirstOfFromYear;
      }
      const monthsJanToTo = calculateMonthsBetween(chargeStartDate, toDate);
      summaryData[assetType].chargeJanToTo += monthlyCharge * monthsJanToTo;
    }

    // ACCUMULATED DEPRECIATION at TO date
    if (purchaseDate <= toDate) {
      const monthsUntilTo = calculateMonthsBetween(purchaseDate, toDate);
      summaryData[assetType].accDepAtTo += monthlyCharge * monthsUntilTo;
    }

    // NET BOOK VALUE at TO date
    if (purchaseDate <= toDate) {
      const nbv = cost - (monthlyCharge * calculateMonthsBetween(purchaseDate, toDate));
      summaryData[assetType].nbvAtTo += Math.max(0, nbv);
    }

    // CHARGE FOR THE MONTH (FROM date to TO date)
    if (purchaseDate <= toDate) {
      let monthChargeStartDate = purchaseDate;
      if (monthChargeStartDate < fromDate) {
        monthChargeStartDate = fromDate;
      }
      const monthsFromToTo = calculateMonthsBetween(monthChargeStartDate, toDate);
      summaryData[assetType].chargeForMonth += monthlyCharge * monthsFromToTo;
    }
  });

  // Build HTML
  let html = '';

  // Row 1: COST AS AT Jan 1
  html += `<tr>
    <td class="details-col">Cost As At</td>
    <td class="date-col">${janFirstDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].costAtJan1)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].costAtJan1, 0))}</td>
  </tr>`;

  // Row 2: ADDITIONS
  html += `<tr>
    <td class="details-col">Additions</td>
    <td class="date-col"></td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].additionsJanToTo)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].additionsJanToTo, 0))}</td>
  </tr>`;

  // Row 3: COST AS AT TO date - SPECIAL HIGHLIGHT
  html += `<tr class="highlight-row special-highlight">
    <td class="details-col">Cost As At</td>
    <td class="date-col">${toDateDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].costAtTo)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].costAtTo, 0))}</td>
  </tr>`;

  // Row 4: ACCUMULATED DEPRECIATION at Jan 1
  html += `<tr>
    <td class="details-col">Accumulated Depreciation</td>
    <td class="date-col">${janFirstDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].accDepAtJan1)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].accDepAtJan1, 0))}</td>
  </tr>`;

  // Row 5: CHARGE FOR THE YEAR/PERIOD
  html += `<tr>
    <td class="details-col">Charge For The Year(Period)</td>
    <td class="date-col"></td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].chargeJanToTo)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].chargeJanToTo, 0))}</td>
  </tr>`;

  // Row 6: ACCUMULATED DEPRECIATION at TO date - SPECIAL HIGHLIGHT
  html += `<tr class="highlight-row special-highlight">
    <td class="details-col">Accumulated Depreciation</td>
    <td class="date-col">${toDateDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].accDepAtTo)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].accDepAtTo, 0))}</td>
  </tr>`;

  // Row 7: NET BOOK VALUE - SPECIAL HIGHLIGHT
  html += `<tr class="highlight-row special-highlight">
    <td class="details-col">Net Book Value</td>
    <td class="date-col">${toDateDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].nbvAtTo)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].nbvAtTo, 0))}</td>
  </tr>`;

  // Row 8: CHARGE FOR THE MONTH - GREEN HIGHLIGHT
  html += `<tr class="highlight-row green-row">
    <td class="details-col">Charge For The Month</td>
    <td class="date-col">${monthDisplay}</td>
    ${ASSET_TYPES.map(type => `<td>${formatCurrency(summaryData[type].chargeForMonth)}</td>`).join('')}
    <td class="total-col">${formatCurrency(ASSET_TYPES.reduce((sum, type) => sum + summaryData[type].chargeForMonth, 0))}</td>
  </tr>`;

  tbody.innerHTML = html;
}

// ============================================
// ACTION DROPDOWN
// ============================================

function openAssetActionDropdown(event, assetName) {
  closeAssetActionDropdown();

  const rect = event.target.closest('button').getBoundingClientRect();
  const portal = document.getElementById('assetActionPortal');

  portal.innerHTML = `
    <div class="action-dropdown-content">
      <button class="dropdown-item" onclick="editAsset('${escapeHtml(assetName)}')">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="dropdown-item" onclick="disposeAsset('${escapeHtml(assetName)}')">
        <i class="fas fa-trash-alt"></i> Dispose
      </button>
    </div>
  `;

  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';

  assetPortalOpen = true;
  event.stopPropagation();
}

function closeAssetActionDropdown() {
  const portal = document.getElementById('assetActionPortal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
  assetPortalOpen = false;
}

function editAsset(assetName) {
  closeAssetActionDropdown();
  showAssetMessage('Edit functionality coming soon for: ' + assetName, 'info');
}

function disposeAsset(assetName) {
  closeAssetActionDropdown();

  if (confirm(`Are you sure you want to dispose of this asset?\n${assetName}`)) {
    showAssetRegisterLoadingModal('Disposing asset...');

    callGAS('updateAssetStatus', { assetName: assetName, newStatus: 'Disposed' })
      .then(response => {
        hideAssetRegisterLoadingModal();
        if (response && !response.error) {
          showAssetMessage('Asset disposed successfully!', 'success');
          loadDetailedRegister();
        } else {
          showAssetMessage('Error disposing asset: ' + (response?.error || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        hideAssetRegisterLoadingModal();
        showAssetMessage('Error disposing asset: ' + (error.message || error), 'error');
      });
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateMonthsElapsed(purchaseDateStr, asOfDateStr) {
  try {
    const purchaseDate = new Date(purchaseDateStr);
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();
    
    const monthsDiff = (asOfDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                       (asOfDate.getMonth() - purchaseDate.getMonth());
    
    return Math.max(0, monthsDiff);
  } catch (e) {
    return 0;
  }
}

function calculateMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  if (end.getDate() >= start.getDate()) {
    months += 1;
  }
  
  return Math.max(0, months);
}

function formatDateDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatMonthDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month}-${year}`;
}

function formatDateForDisplay(date) {
  if (!date) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function showAssetMessage(message, type) {
  const modal = document.getElementById('messageModal');
  const messageDiv = document.getElementById('modalMessage');

  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message',
    warning: 'warning-message'
  };

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
}

function closeAssetModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showAssetLoadingModal(message = 'Adding Asset...') {
  let modal = document.getElementById('assetLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetLoadingModal';
    modal.className = 'asset-loading-modal';
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

function hideAssetLoadingModal() {
  const modal = document.getElementById('assetLoadingModal');
  if (modal) modal.style.display = 'none';
}

function showAssetRegisterLoadingModal(message = 'Processing...') {
  let modal = document.getElementById('assetRegisterLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetRegisterLoadingModal';
    modal.className = 'asset-register-loading-modal';
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

function hideAssetRegisterLoadingModal() {
  const modal = document.getElementById('assetRegisterLoadingModal');
  if (modal) modal.style.display = 'none';
}

function showAssetRegisterEmptyState(elementId, message, colSpan) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" class="loading-cell">
        <i class="fas fa-folder-open"></i>
        <p>${message}</p>
      </td>
    </tr>
  `;
}

function showAssetRegisterLoadingSpinner(elementId) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  const colSpan = elementId === 'detailedRegisterBody' ? 11 : 9;
  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" class="loading-cell">Loading...</td>
    </tr>
  `;
}

// Add event listener for cost and date changes to update depreciation info
document.addEventListener('DOMContentLoaded', function() {
  const costField = document.getElementById('assetCost');
  const dateField = document.getElementById('dateOfPurchase');
  const typeField = document.getElementById('assetType');
  
  if (costField) costField.addEventListener('input', function() {
    if (typeField && typeField.value) calculateDepreciationInfo(typeField.value);
  });
  
  if (dateField) dateField.addEventListener('change', function() {
    if (typeField && typeField.value) calculateDepreciationInfo(typeField.value);
  });
});

// Export functions for global use
window.initAssetModule = initAssetModule;
window.initAssetRegisterModule = initAssetRegisterModule;
window.handleAssetTypeChange = handleAssetTypeChange;
window.submitNewAsset = submitNewAsset;
window.switchAssetRegisterTab = switchAssetRegisterTab;
window.recalculateAssetValues = recalculateAssetValues;
window.recalculateSummaryRegister = recalculateSummaryRegister;
window.openAssetActionDropdown = openAssetActionDropdown;
window.editAsset = editAsset;
window.disposeAsset = disposeAsset;
window.closeAssetModal = closeAssetModal;
