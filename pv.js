/* ============================================
   PAYMENT VOUCHER MODULE JAVASCRIPT
   ============================================ */

// Global variables for PV module
let lastSubmittedVoucherData = null;
let currentlyEditingPvNumber = null;
let nextPvNumber = null;

// ============================================
// INITIALIZATION
// ============================================

function initPVModule() {
    console.log('PV Module initializing...');
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('date');
    if (dateField) dateField.value = today;
    
    updateVoucherTypeFields();
    fetchPVTable();
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (window.__pvPortalOpen) {
            const portal = document.getElementById('pv-dropdown-portal');
            if (portal && !portal.contains(event.target) && !event.target.classList.contains('pv-btn')) {
                closeDropdownPortal();
            }
        }
        
        // Close modal when clicking outside
        const voucherModal = document.getElementById('voucher-preview-modal');
        const loadingModal = document.getElementById('loading-modal');
        
        if (event.target === voucherModal) {
            closeVoucherModal();
        }
        if (event.target === loadingModal) {
            hideModal();
        }
    });
}

// ============================================
// VOUCHER TYPE HANDLERS
// ============================================

function updateVoucherTypeFields() {
    const voucherType = document.getElementById('voucherType').value;
    const bankField = document.getElementById('bankField');
    const chequeNumberField = document.getElementById('chequeNumberField');
    
    if (voucherType === 'Cheque Payment Voucher') {
        if (bankField) bankField.style.display = 'flex';
        if (chequeNumberField) chequeNumberField.style.display = 'flex';
    } else {
        if (bankField) bankField.style.display = 'none';
        if (chequeNumberField) chequeNumberField.style.display = 'none';
        
        const bankInput = document.getElementById('bank');
        const chequeInput = document.getElementById('chequeNumber');
        if (bankInput) bankInput.value = '';
        if (chequeInput) chequeInput.value = '';
    }
    
    fetchNextPVNumber(voucherType);
}

function toggleWithholdingTax() {
    const checkbox = document.getElementById('withholdingTaxCheckbox');
    const taxField = document.getElementById('withholdingTaxAmount');
    
    if (checkbox && taxField) {
        taxField.style.display = checkbox.checked ? 'block' : 'none';
        if (!checkbox.checked) {
            taxField.value = '';
        }
    }
}

// ============================================
// API CALLS
// ============================================

function fetchNextPVNumber(voucherType) {
    if (!window.API) {
        console.error('API not available');
        return;
    }
    
    API.getNextPVNumber(voucherType)
        .then(response => {
            if (response && !response.error) {
                nextPvNumber = response;
                if (!currentlyEditingPvNumber) {
                    const pvField = document.getElementById('pvNumber');
                    const pvDisplay = document.getElementById('pvNumberDisplay');
                    if (pvField) pvField.value = response;
                    if (pvDisplay) pvDisplay.textContent = response;
                }
            } else {
                console.error('Error fetching PV number:', response);
            }
        })
        .catch(error => {
            console.error('Error fetching next PV number:', error);
            showError('Failed to get PV number: ' + error.message);
        });
}

function fetchPVTable() {
    if (!window.API) {
        console.error('API not available');
        return;
    }
    
    API.getPVNumbersByType()
        .then(response => {
            if (response && !response.error) {
                renderPVList('cash-payment-list', response['Cash Payment Voucher']);
                renderPVList('cheque-list', response['Cheque Payment Voucher']);
                renderPVList('payment-list', response['Payment Voucher']);
            } else {
                console.error('Error fetching PV table:', response);
            }
        })
        .catch(error => {
            console.error('Error fetching PV table:', error);
        });
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPVList(elementId, pvList) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (!pvList || !pvList.length) {
        el.innerHTML = '<div style="color:#aaa;">None</div>';
        return;
    }
    
    const items = pvList.slice(-5).reverse().map(item => {
        const match = item.pvNumber.match(/(PVNO\.[A-Z]{2})(\d+)/);
        let formattedPV = item.pvNumber;
        
        if (match) {
            const prefix = match[1];
            const num = match[2].padStart(5, '0');
            formattedPV = prefix + num;
        }
        
        return `<button class="pv-btn" onclick="openDropdownPortal(event, this, '${formattedPV}', '${item.voucherType}')">${formattedPV}</button>`;
    }).join('');
    
    el.innerHTML = items;
}

// ============================================
// DROPDOWN PORTAL
// ============================================

function openDropdownPortal(event, btn, pvNumber, voucherType) {
    closeDropdownPortal();
    
    const rect = btn.getBoundingClientRect();
    const portal = document.getElementById('pv-dropdown-portal');
    if (!portal) return;
    
    portal.innerHTML = `
        <div class="pv-dropdown-content-portal">
            <button class="dropdown-item" onclick="viewVoucher('${pvNumber}', '${voucherType}')">View</button>
            <button class="dropdown-item" onclick="editVoucher('${pvNumber}', '${voucherType}')">Edit</button>
        </div>
    `;
    
    portal.style.display = 'block';
    portal.style.position = 'fixed';
    portal.style.top = (rect.bottom + window.scrollY) + 'px';
    portal.style.left = (rect.left + window.scrollX) + 'px';
    portal.style.zIndex = '10000';
    
    window.__pvPortalOpen = true;
    event.stopPropagation();
}

function closeDropdownPortal() {
    const portal = document.getElementById('pv-dropdown-portal');
    if (portal) {
        portal.innerHTML = '';
        portal.style.display = 'none';
    }
    window.__pvPortalOpen = false;
}

// ============================================
// VOUCHER CRUD OPERATIONS
// ============================================

function viewVoucher(pvNumber, voucherType) {
    closeDropdownPortal();
    showLoading('Loading voucher...');
    
    API.getVoucherByNumber(pvNumber, voucherType)
        .then(response => {
            hideLoading();
            if (response && !response.error && response.pvNumber) {
                showVoucherPreview(response);
            } else {
                showError('No voucher data found for PV Number: ' + pvNumber);
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error loading voucher: ' + (error.message || error));
        });
}

function editVoucher(pvNumber, voucherType) {
    closeDropdownPortal();
    showLoading('Loading voucher for editing...');
    
    currentlyEditingPvNumber = pvNumber;
    
    const pvDisplay = document.getElementById('pvNumberDisplay');
    if (pvDisplay) pvDisplay.textContent = pvNumber;
    
    API.getVoucherByNumber(pvNumber, voucherType)
        .then(response => {
            hideLoading();
            if (response && !response.error && response.pvNumber) {
                populateFormForEditing(response);
                fetchNextPVNumber(response.voucherType);
            } else {
                showError('No voucher data found for PV Number: ' + pvNumber);
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error loading voucher for editing: ' + (error.message || error));
        });
}

function populateFormForEditing(voucherData) {
    const pvContainer = document.getElementById('pvNumber-container');
    const dateContainer = document.getElementById('date-container');
    if (pvContainer) pvContainer.style.display = 'flex';
    if (dateContainer) dateContainer.style.display = 'flex';
    
    const pvDisplay = document.getElementById('pvNumberDisplay');
    const pvNumberField = document.getElementById('pvNumber');
    if (pvDisplay) pvDisplay.textContent = voucherData.pvNumber || '';
    if (pvNumberField) pvNumberField.value = voucherData.pvNumber || '';
    
    const updateBtn = document.getElementById('updateButton');
    const submitBtn = document.querySelector('#pvForm .submit-button');
    if (updateBtn) updateBtn.style.display = 'block';
    if (submitBtn) submitBtn.style.display = 'none';
    
    // Populate form fields
    document.getElementById('voucherType').value = voucherData.voucherType || '';
    document.getElementById('date').value = voucherData.date || '';
    document.getElementById('invoiceNo').value = voucherData.invoiceNo || '';
    document.getElementById('invoiceDate').value = voucherData.invoiceDate || '';
    document.getElementById('address').value = voucherData.address || '';
    document.getElementById('payableTo').value = voucherData.payableTo || '';
    document.getElementById('amount').value = voucherData.amount || '';
    document.getElementById('department').value = voucherData.department || 'Accounts';
    document.getElementById('accountCode').value = voucherData.accountCode || '';
    document.getElementById('transactionDetails').value = voucherData.transactionDetails || '';
    document.getElementById('bank').value = voucherData.bank || '';
    document.getElementById('chequeNumber').value = voucherData.chequeNumber || '';
    document.getElementById('requestedBy').value = voucherData.requestedBy || '';
    document.getElementById('reviewedBy').value = voucherData.reviewedBy || '';
    document.getElementById('authorizedBy').value = voucherData.authorizedBy || '';
    
    const wtCheckbox = document.getElementById('withholdingTaxCheckbox');
    const wtField = document.getElementById('withholdingTaxAmount');
    if (wtCheckbox && wtField) {
        if (voucherData.withholdingTaxAmount) {
            wtCheckbox.checked = true;
            wtField.value = voucherData.withholdingTaxAmount;
            wtField.style.display = 'block';
        } else {
            wtCheckbox.checked = false;
            wtField.value = '';
            wtField.style.display = 'none';
        }
    }
    
    updateVoucherTypeFields();
    
    const formContainer = document.querySelector('.form-container');
    if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth' });
}

function submitForm() {
    showLoading('Processing voucher...');
    
    const formObject = {
        voucherType: document.getElementById('voucherType').value,
        pvNumber: document.getElementById('pvNumber').value,
        date: document.getElementById('date').value,
        invoiceNo: document.getElementById('invoiceNo').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        address: document.getElementById('address').value,
        payableTo: document.getElementById('payableTo').value,
        amount: document.getElementById('amount').value,
        department: document.getElementById('department').value,
        accountCode: document.getElementById('accountCode').value,
        transactionDetails: document.getElementById('transactionDetails').value,
        bank: document.getElementById('bank').value,
        chequeNumber: document.getElementById('chequeNumber').value,
        requestedBy: document.getElementById('requestedBy').value,
        reviewedBy: document.getElementById('reviewedBy').value,
        authorizedBy: document.getElementById('authorizedBy').value,
        withholdingTaxAmount: document.getElementById('withholdingTaxCheckbox').checked ? 
            document.getElementById('withholdingTaxAmount').value : null
    };
    
    formObject.amountInWords = convertNumberToWords(formObject.amount);
    lastSubmittedVoucherData = formObject;
    
    API.processForm(formObject)
        .then(response => {
            hideLoading();
            if (response && !response.error) {
                showSuccessMessage('Voucher created successfully!');
                setTimeout(() => {
                    const voucherType = document.getElementById('voucherType');
                    if (voucherType) fetchNextPVNumber(voucherType.value);
                    clearFormExceptPVDateType();
                    fetchPVTable();
                }, 500);
            } else {
                showError('Error creating voucher: ' + (response?.error || 'Unknown error'));
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error creating voucher: ' + (error.message || error));
        });
}

function updateForm() {
    showLoading('Updating voucher...');
    
    const formObject = {
        pvNumber: document.getElementById('pvNumber').value,
        voucherType: document.getElementById('voucherType').value,
        date: document.getElementById('date').value,
        invoiceNo: document.getElementById('invoiceNo').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        address: document.getElementById('address').value,
        payableTo: document.getElementById('payableTo').value,
        amount: document.getElementById('amount').value,
        department: document.getElementById('department').value,
        accountCode: document.getElementById('accountCode').value,
        transactionDetails: document.getElementById('transactionDetails').value,
        bank: document.getElementById('bank').value,
        chequeNumber: document.getElementById('chequeNumber').value,
        requestedBy: document.getElementById('requestedBy').value,
        reviewedBy: document.getElementById('reviewedBy').value,
        authorizedBy: document.getElementById('authorizedBy').value,
        withholdingTaxAmount: document.getElementById('withholdingTaxCheckbox').checked ? 
            document.getElementById('withholdingTaxAmount').value : null
    };
    
    formObject.amountInWords = convertNumberToWords(formObject.amount);
    lastSubmittedVoucherData = formObject;
    
    API.updateVoucher(formObject)
        .then(response => {
            hideLoading();
            if (response && !response.error) {
                showSuccessMessage('Voucher updated successfully!');
                fetchPVTable();
                resetFormAfterUpdate();
            } else {
                showError('Error updating voucher: ' + (response?.error || 'Unknown error'));
            }
        })
        .catch(error => {
            hideLoading();
            showError('Error updating voucher: ' + (error.message || error));
        });
}

function resetFormAfterUpdate() {
    const updateBtn = document.getElementById('updateButton');
    const submitBtn = document.querySelector('#pvForm .submit-button');
    if (updateBtn) updateBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'block';
    
    currentlyEditingPvNumber = null;
    clearFormExceptPVDateType();
    
    const pvDisplay = document.getElementById('pvNumberDisplay');
    if (pvDisplay && nextPvNumber) pvDisplay.textContent = nextPvNumber;
    
    const pvContainer = document.getElementById('pvNumber-container');
    const dateContainer = document.getElementById('date-container');
    if (pvContainer) pvContainer.style.display = 'none';
    if (dateContainer) dateContainer.style.display = 'none';
}

function clearFormExceptPVDateType() {
    const ids = [
        'invoiceNo', 'invoiceDate', 'address', 'payableTo', 'amount',
        'transactionDetails', 'bank', 'chequeNumber', 'accountCode',
        'requestedBy', 'reviewedBy', 'authorizedBy', 'withholdingTaxAmount'
    ];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const deptSelect = document.getElementById('department');
    if (deptSelect) deptSelect.value = 'Accounts';
    
    const wtCheckbox = document.getElementById('withholdingTaxCheckbox');
    if (wtCheckbox) {
        wtCheckbox.checked = false;
        const wtField = document.getElementById('withholdingTaxAmount');
        if (wtField) {
            wtField.style.display = 'none';
            wtField.value = '';
        }
    }
}

// ============================================
// VOUCHER PREVIEW
// ============================================

function showVoucherPreview(voucherData) {
    if (!voucherData || typeof voucherData !== 'object') {
        showError('Invalid voucher data received');
        return;
    }
    
    // Default values
    voucherData = voucherData || {};
    voucherData.voucherType = voucherData.voucherType || 'Payment Voucher';
    voucherData.pvNumber = voucherData.pvNumber || '';
    voucherData.date = voucherData.date || '';
    voucherData.payableTo = voucherData.payableTo || '';
    voucherData.address = voucherData.address || '';
    voucherData.department = voucherData.department || '';
    voucherData.accountCode = voucherData.accountCode || '';
    voucherData.invoiceDate = voucherData.invoiceDate || '';
    voucherData.invoiceNo = voucherData.invoiceNo || '';
    voucherData.amount = voucherData.amount || '';
    voucherData.amountInWords = voucherData.amountInWords || '';
    voucherData.transactionDetails = voucherData.transactionDetails || '';
    voucherData.bank = voucherData.bank || '';
    voucherData.chequeNumber = voucherData.chequeNumber || '';
    voucherData.requestedBy = voucherData.requestedBy || '';
    voucherData.reviewedBy = voucherData.reviewedBy || '';
    voucherData.authorizedBy = voucherData.authorizedBy || '';
    voucherData.withholdingTaxAmount = voucherData.withholdingTaxAmount || '';
    
    const typeHeading = {
        'Payment Voucher': 'FUNDS TRANSFER PAYMENT VOUCHER',
        'Cash Payment Voucher': 'CASH PAYMENT VOUCHER',
        'Cheque Payment Voucher': 'CHEQUE DISBURSEMENT PAYMENT VOUCHER'
    };
    
    const voucherTypeHeading = document.getElementById('voucherTypeHeading');
    if (voucherTypeHeading) {
        voucherTypeHeading.innerHTML = `<b>${typeHeading[voucherData.voucherType] || 'PAYMENT VOUCHER'}</b>`;
    }
    
    // Handle cheque fields
    const chequeFields = document.getElementById('preview-cheque-fields');
    if (chequeFields) {
        if (voucherData.voucherType === 'Cheque Payment Voucher') {
            chequeFields.style.display = 'flex';
            const previewBank = document.getElementById('preview-bank');
            const previewCheque = document.getElementById('preview-chequeNumber');
            if (previewBank) previewBank.textContent = voucherData.bank;
            if (previewCheque) previewCheque.textContent = voucherData.chequeNumber;
        } else {
            chequeFields.style.display = 'none';
        }
    }
    
    // Handle withholding tax
    const withholdingTaxRow = document.getElementById('preview-withholdingTax-row');
    if (withholdingTaxRow) {
        if (voucherData.withholdingTaxAmount) {
            withholdingTaxRow.style.display = 'flex';
            const previewTax = document.getElementById('preview-withholdingTax');
            if (previewTax) previewTax.textContent = voucherData.withholdingTaxAmount;
        } else {
            withholdingTaxRow.style.display = 'none';
        }
    }
    
    // Populate preview fields
    document.getElementById('preview-pvNumber').textContent = voucherData.pvNumber;
    document.getElementById('preview-payableTo').textContent = voucherData.payableTo;
    document.getElementById('preview-date').textContent = voucherData.date;
    document.getElementById('preview-address').textContent = voucherData.address;
    document.getElementById('preview-department').textContent = voucherData.department;
    document.getElementById('preview-accountCode').textContent = voucherData.accountCode;
    document.getElementById('preview-invoiceDate').textContent = voucherData.invoiceDate;
    document.getElementById('preview-invoiceNo').textContent = voucherData.invoiceNo;
    
    const amountNum = parseFloat(voucherData.amount);
    document.getElementById('preview-amount').textContent = amountNum.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    });
    
    document.getElementById('preview-amountInWords').textContent = voucherData.amountInWords;
    document.getElementById('preview-transactionDetails').textContent = voucherData.transactionDetails;
    document.getElementById('preview-requestedBy').textContent = voucherData.requestedBy;
    document.getElementById('preview-reviewedBy').textContent = voucherData.reviewedBy;
    document.getElementById('preview-authorizedBy').textContent = voucherData.authorizedBy;
    document.getElementById('preview-receivedBy').textContent = '';
    
    const voucherModal = document.getElementById('voucher-preview-modal');
    if (voucherModal) voucherModal.style.display = 'block';
}

function closeVoucherModal() {
    const voucherModal = document.getElementById('voucher-preview-modal');
    if (voucherModal) voucherModal.style.display = 'none';
}

function previewVoucherFromLast() {
    if (!lastSubmittedVoucherData) {
        showError('No voucher data to preview');
        return;
    }
    hideModal();
    showVoucherPreview(lastSubmittedVoucherData);
}

function printVoucher() {
    const actions = document.querySelector('.modal-actions');
    if (actions) actions.style.display = 'none';
    window.print();
    setTimeout(() => {
        if (actions) actions.style.display = 'flex';
    }, 500);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function convertNumberToWords(amount) {
    if (!amount || isNaN(amount)) return '';
    
    const amt = parseFloat(amount).toFixed(2);
    const parts = amt.split('.');
    let cedis = parseInt(parts[0], 10);
    const pesewas = parseInt(parts[1], 10);
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Million', 'Billion'];
    
    function chunkToWords(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred';
            n %= 100;
            if (n > 0) str += ' and ';
            else str += ' ';
        }
        if (n >= 10 && n < 20) {
            str += teens[n - 10] + ' ';
        } else if (n >= 20 || n === 10) {
            str += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0 && n < 10) {
            str += ones[n] + ' ';
        }
        return str.trim();
    }
    
    let wordChunks = [];
    let chunkCount = 0;
    let tempCedis = cedis;
    
    while (tempCedis > 0) {
        let chunk = tempCedis % 1000;
        if (chunk > 0) {
            let chunkWord = chunkToWords(chunk);
            if (chunkWord) {
                chunkWord += thousands[chunkCount] ? ' ' + thousands[chunkCount] : '';
                wordChunks.unshift(chunkWord.trim());
            }
        }
        tempCedis = Math.floor(tempCedis / 1000);
        chunkCount++;
    }
    
    if (wordChunks.length > 1 && wordChunks[wordChunks.length - 1].startsWith('and ')) {
        wordChunks[wordChunks.length - 1] = wordChunks[wordChunks.length - 1].replace(/^and /, '');
    }
    if (wordChunks.length === 1 && wordChunks[0].startsWith('and ')) {
        wordChunks[0] = wordChunks[0].replace(/^and /, '');
    }
    
    let cedisStr = wordChunks.length ? wordChunks.join(' ') + (cedis === 1 ? ' Ghana Cedi' : ' Ghana Cedis') : '';
    let pesewasStr = '';
    
    if (pesewas > 0) {
        let pesewaWords = chunkToWords(pesewas);
        pesewasStr = (cedisStr ? ' and ' : '') + pesewaWords + (pesewas === 1 ? ' Pesewa' : ' Pesewas');
    }
    
    return (cedisStr + pesewasStr).trim();
}

// ============================================
// MODAL HELPERS
// ============================================

function showModal(html) {
    let modal = document.getElementById('loading-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'loading-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div class="modal-content" id="modal-message">${html}</div>`;
    modal.style.display = 'flex';
}

function hideModal() {
    const modal = document.getElementById('loading-modal');
    if (modal) modal.style.display = 'none';
}

function showSuccessMessage(message) {
    showModal(`
        <div class="success-message">${message}</div>
        <br>
        <button class="download-button" onclick="previewVoucherFromLast()">View & Print</button>
        <br>
        <button class="modal-close-button" onclick="hideModal(); resetFormAfterUpdate();">Close</button>
    `);
}

function showErrorMessage(message) {
    showModal(`
        <div class="modal-error-message">Error: ${message}</div>
        <button class="modal-close-button" onclick="hideModal()">Close</button>
    `);
}

// Override global showError to use PV-specific modal
const originalShowError = window.showError;
window.showError = function(message) {
    if (document.getElementById('pvForm')) {
        showErrorMessage(message);
    } else if (originalShowError) {
        originalShowError(message);
    }
};

// Override global showSuccess to use PV-specific modal
const originalShowSuccess = window.showSuccess;
window.showSuccess = function(message) {
    if (document.getElementById('pvForm')) {
        showSuccessMessage(message);
    } else if (originalShowSuccess) {
        originalShowSuccess(message);
    }
};

// Export functions for global use
window.initPVModule = initPVModule;
window.updateVoucherTypeFields = updateVoucherTypeFields;
window.toggleWithholdingTax = toggleWithholdingTax;
window.openDropdownPortal = openDropdownPortal;
window.closeDropdownPortal = closeDropdownPortal;
window.viewVoucher = viewVoucher;
window.editVoucher = editVoucher;
window.submitForm = submitForm;
window.updateForm = updateForm;
window.previewVoucherFromLast = previewVoucherFromLast;
window.printVoucher = printVoucher;
window.closeVoucherModal = closeVoucherModal;
window.hideModal = hideModal;
window.resetFormAfterUpdate = resetFormAfterUpdate;
