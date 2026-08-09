// Broadcast Miraya Main Application Controller

document.addEventListener('DOMContentLoaded', async () => {
  // App State Initialization
  let customers = JSON.parse(localStorage.getItem('miraya_customers')) || INITIAL_CUSTOMERS;
  let campaigns = JSON.parse(localStorage.getItem('miraya_campaigns')) || INITIAL_CAMPAIGNS;
  let templates = TEMPLATES;
  let selectedTemplate = templates[0];

  // DOM Elements
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Load Data from Backend API (Neon PostgreSQL)
  async function fetchBackendData() {
    try {
      const custRes = await fetch('/api/customers');
      if (custRes.ok) {
        const dbCusts = await custRes.json();
        if (Array.isArray(dbCusts)) customers = dbCusts;
      }

      const campRes = await fetch('/api/campaigns');
      if (campRes.ok) {
        const dbCamps = await campRes.json();
        if (Array.isArray(dbCamps)) {
          campaigns = dbCamps.map(c => ({
            id: c.id,
            name: c.name,
            templateName: c.template_name,
            targetSegment: c.target_segment,
            totalRecipients: c.total_recipients,
            sent: c.sent_count,
            delivered: c.delivered_count,
            read: c.read_count,
            failed: c.failed_count,
            createdAt: new Date(c.created_at).toLocaleString(),
            status: c.status
          }));
        }
      }
    } catch (e) {
      console.log('Running in local standalone mode:', e.message);
    }
  }

  await fetchBackendData();

  // Initialize UI & Event Handlers
  initNavigation();
  renderOverviewMetrics();
  renderCustomerTable(customers);
  renderTemplateList();
  renderCampaignHistory();
  updateLivePhonePreview();
  initModals();
  initFormListeners();
  await initAPIConfigModal();

  // Navigation Logic
  function initNavigation() {
    navButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetTab = btn.getAttribute('data-tab');
        navButtons.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');

        if (targetTab === 'dashboard') {
          await fetchBackendData();
          renderOverviewMetrics();
        } else if (targetTab === 'campaigns') {
          await fetchBackendData();
          renderCampaignHistory();
        } else if (targetTab === 'customers') {
          await fetchBackendData();
          renderCustomerTable(customers);
        }
      });
    });
  }

  // Dashboard Overview Metrics
  function renderOverviewMetrics() {
    const stats = AnalyticsManager.calculateOverviewStats(campaigns, customers);
    document.getElementById('metric-total-customers').innerText = stats.totalCustomers;
    document.getElementById('metric-active-campaigns').innerText = stats.totalCampaigns;
    document.getElementById('metric-messages-sent').innerText = stats.totalSent.toLocaleString();
    document.getElementById('metric-read-rate').innerText = `${stats.readRate}%`;

    // Render Recent Campaign Table
    const recentTableBody = document.getElementById('recent-campaigns-body');
    if (recentTableBody) {
      recentTableBody.innerHTML = campaigns.slice(-5).reverse().map(c => `
        <tr>
          <td><strong>${c.name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${c.id}</span></td>
          <td><span class="tag">${c.targetSegment}</span></td>
          <td>${c.totalRecipients}</td>
          <td><span class="badge badge-read">${c.read} Read (${Math.round((c.read/c.totalRecipients)*100)}%)</span></td>
          <td><span class="badge badge-sent">${c.status}</span></td>
          <td><button class="btn btn-secondary btn-sm view-log-btn" data-id="${c.id}">View Logs</button></td>
        </tr>
      `).join('');

      // Add View Logs Handlers
      document.querySelectorAll('.view-log-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const campId = btn.getAttribute('data-id');
          showCampaignLogsModal(campId);
        });
      });
    }

    AnalyticsManager.renderDeliveryDonutChart('dashboard-delivery-chart', stats.totalSent, stats.totalDelivered, stats.totalRead, stats.totalSent - stats.totalDelivered);
  }

  // Render Customer Table
  function renderCustomerTable(customerList) {
    const tbody = document.getElementById('customer-table-body');
    if (!tbody) return;

    if (customerList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No customers found. Upload CSV or add new customer.</td></tr>`;
      return;
    }

    tbody.innerHTML = customerList.map(c => `
      <tr>
        <td><input type="checkbox" class="customer-select-chk" data-id="${c.id}"></td>
        <td><strong>${c.name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${c.id}</span></td>
        <td>${c.phone}</td>
        <td><span class="tag">${c.tag || 'Customer'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm delete-cust-btn" data-id="${c.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    document.getElementById('customer-count-badge').innerText = `${customerList.length} Total Customers`;

    // Customer Delete Handlers
    document.querySelectorAll('.delete-cust-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        customers = customers.filter(c => c.id !== id);
        localStorage.setItem('miraya_customers', JSON.stringify(customers));
        renderCustomerTable(customers);
        renderOverviewMetrics();
      });
    });
  }

  // Render Approved Templates List
  function renderTemplateList() {
    const listContainer = document.getElementById('template-cards-container');
    if (!listContainer) return;

    listContainer.innerHTML = templates.map(t => `
      <div class="card template-card ${t.id === selectedTemplate.id ? 'active-template' : ''}" data-id="${t.id}" style="margin-bottom:1rem; cursor:pointer; border:${t.id === selectedTemplate.id ? '2px solid var(--primary-wa)' : '1px solid var(--border-color)'};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:0.95rem; font-weight:700;">${t.title}</h4>
          <span class="badge badge-read">${t.status}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); font-family:monospace; margin-bottom:8px;">Template Name: ${t.name}</div>
        <p style="font-size:0.82rem; color:var(--text-main); white-space:pre-line; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${t.body}</p>
        <div style="margin-top:10px; display:flex; gap:6px;">
          ${t.variables.map(v => `<span class="tag" style="font-size:0.7rem;">{{${v}}}</span>`).join('')}
        </div>
      </div>
    `).join('');

    // Select template click listener
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        const tId = card.getAttribute('data-id');
        selectedTemplate = templates.find(t => t.id === tId);
        renderTemplateList();
        renderVariableInputFields();
        updateLivePhonePreview();
      });
    });

    renderVariableInputFields();
  }

  // Render variable inputs for current template
  function renderVariableInputFields() {
    const varContainer = document.getElementById('template-variables-form');
    if (!varContainer) return;

    varContainer.innerHTML = selectedTemplate.variables.map((varName, idx) => {
      const varKey = (idx + 1).toString();
      const defaultVal = selectedTemplate.defaultVarValues[varKey] || '';
      return `
        <div class="form-group">
          <label class="form-label">Placeholder {{${varKey}}} - ${varName}</label>
          <input type="text" class="form-control tpl-var-input" data-key="${varKey}" value="${defaultVal}">
        </div>
      `;
    }).join('');

    document.querySelectorAll('.tpl-var-input').forEach(input => {
      input.addEventListener('input', updateLivePhonePreview);
    });
  }

  // Update WhatsApp Live Mobile Mockup Preview
  function updateLivePhonePreview() {
    const previewContainer = document.getElementById('wa-preview-text');
    if (!previewContainer) return;

    const posterUrl = document.getElementById('poster-url-input')?.value || '';
    const customMsgInput = document.getElementById('custom-message-content')?.value;

    const rawText = customMsgInput || selectedTemplate.body;
    const formattedText = waService.formatTemplateMessage(rawText, { '1': 'Priya Sharma', 'name': 'Priya Sharma' });

    const htmlText = formattedText
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    let mediaHeaderHtml = '';
    if (posterUrl) {
      mediaHeaderHtml = `<img src="${posterUrl}" alt="Campaign Poster" style="width:100%; border-radius:8px; margin-bottom:8px; max-height:200px; object-fit:cover; display:block;" onerror="this.style.display='none';">`;
    }

    previewContainer.innerHTML = mediaHeaderHtml + htmlText;
    const previewTimeEl = document.getElementById('wa-preview-time');
    if (previewTimeEl) previewTimeEl.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Render Campaign History List
  function renderCampaignHistory() {
    const container = document.getElementById('campaign-history-body');
    if (!container) return;

    container.innerHTML = campaigns.map(c => `
      <tr>
        <td><strong>${c.name}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${c.id}</span></td>
        <td><span style="font-size:0.8rem; font-family:monospace;">${c.templateName}</span></td>
        <td><span class="tag">${c.targetSegment}</span></td>
        <td>${c.totalRecipients} Customers</td>
        <td><span class="badge badge-sent">${c.sent} Sent</span></td>
        <td><span class="badge badge-read">${c.read} Read</span></td>
        <td><span class="badge badge-failed">${c.failed} Failed</span></td>
        <td><button class="btn btn-secondary btn-sm view-log-btn" data-id="${c.id}">View Detailed Log</button></td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-log-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const campId = btn.getAttribute('data-id');
        showCampaignLogsModal(campId);
      });
    });
  }

  // Initialize Search, Filter & Quick Broadcast Listeners
  function initFormListeners() {
    renderQuickLinks();

    // Radio Recipient Source Toggle
    const dbRadio = document.getElementById('source-db-radio');
    const pasteRadio = document.getElementById('source-paste-radio');
    const groupSegment = document.getElementById('group-segment-select');
    const groupPaste = document.getElementById('group-paste-numbers');

    if (dbRadio && pasteRadio) {
      dbRadio.addEventListener('change', () => {
        groupSegment.style.display = 'block';
        groupPaste.style.display = 'none';
      });
      pasteRadio.addEventListener('change', () => {
        groupSegment.style.display = 'none';
        groupPaste.style.display = 'block';
      });
    }

    // Search Customer Input
    const searchInput = document.getElementById('search-customer-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = customers.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.phone.includes(query) || 
          c.city.toLowerCase().includes(query) || 
          c.tag.toLowerCase().includes(query)
        );
        renderCustomerTable(filtered);
      });
    }

    // Segment Filter Select
    const filterSelect = document.getElementById('filter-segment-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        const tag = e.target.value;
        if (tag === 'ALL') {
          renderCustomerTable(customers);
        } else {
          const filtered = customers.filter(c => c.tag === tag);
          renderCustomerTable(filtered);
        }
      });
    }

    // CSV Customer Import Reader
    const csvFileInput = document.getElementById('csv-file-input');
    if (csvFileInput) {
      csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
          const text = evt.target.result;
          const lines = text.split('\n');
          const newCustomers = [];

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            if (parts.length >= 2) {
              newCustomers.push({
                id: 'CUST-' + Math.floor(1000 + Math.random() * 9000),
                name: parts[0].trim(),
                phone: parts[1].trim(),
                city: parts[2] ? parts[2].trim() : 'Mumbai',
                tag: parts[3] ? parts[3].trim() : 'General',
                totalPurchases: 1,
                lastVisited: new Date().toISOString().split('T')[0]
              });
            }
          }

          if (newCustomers.length > 0) {
            customers = [...customers, ...newCustomers];
            localStorage.setItem('miraya_customers', JSON.stringify(customers));
            renderCustomerTable(customers);
            renderOverviewMetrics();
            renderQuickLinks();
            alert(`Successfully imported ${newCustomers.length} customers from CSV!`);
            closeModal('csv-import-modal');
          }
        };
        reader.readAsText(file);
      });
    }

    // Poster Image & Custom Message Listeners
    const posterUrlInput = document.getElementById('poster-url-input');
    if (posterUrlInput) posterUrlInput.addEventListener('input', updateLivePhonePreview);

    const customMsgContent = document.getElementById('custom-message-content');
    if (customMsgContent) customMsgContent.addEventListener('input', updateLivePhonePreview);

    const posterFileInput = document.getElementById('poster-file-input');
    if (posterFileInput) {
      posterFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (posterUrlInput) posterUrlInput.value = evt.target.result;
            updateLivePhonePreview();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Campaign Dispatch Form Trigger
    const campaignForm = document.getElementById('launch-campaign-form');
    if (campaignForm) {
      campaignForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const campaignName = document.getElementById('campaign-name-input').value;
        const isPasteSource = document.getElementById('source-paste-radio')?.checked;
        const customMessage = document.getElementById('custom-message-content')?.value || selectedTemplate.body;
        const posterUrl = document.getElementById('poster-url-input')?.value || '';

        let targetRecipients = [];

        if (isPasteSource) {
          const pastedText = document.getElementById('pasted-phone-numbers').value.trim();
          if (!pastedText) {
            alert('Please enter at least one Name and Phone Number!');
            return;
          }
          const rawLines = pastedText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
          targetRecipients = rawLines.map((line, idx) => {
            const parts = line.split(',');
            let name = `Customer ${idx + 1}`;
            let phone = line;
            if (parts.length >= 2) {
              name = parts[0].trim();
              phone = parts[1].trim();
            }
            return {
              id: `RAW-${idx + 1}`,
              name: name,
              phone: phone.startsWith('+') ? phone : `+91 ${phone}`,
              city: 'India',
              tag: 'Broadcast Recipient'
            };
          });
        } else {
          const segment = document.getElementById('campaign-segment-select').value;
          if (segment === 'ALL') {
            targetRecipients = customers;
          } else {
            targetRecipients = customers.filter(c => c.tag === segment);
          }
        }

        if (targetRecipients.length === 0) {
          alert('No valid recipients found to send broadcast!');
          return;
        }

        // Set active credentials from selected Owner Account
        const selectedAccountId = document.getElementById('sender-account-select')?.value;
        if (selectedAccountId && selectedAccountId !== 'DEFAULT') {
          const chosenAccount = savedAccounts.find(a => a.id == selectedAccountId);
          if (chosenAccount) {
            waService.saveConfig(chosenAccount.api_token, chosenAccount.phone_id, chosenAccount.waba_id);
          }
        }

        // Open Dispatch Modal Visualizer
        openModal('dispatch-progress-modal');

        // Dynamic template object created from form textarea
        const activeTemplateObj = {
          name: 'custom_broadcast_msg',
          body: customMessage
        };

        // Run Real / Simulated Dispatch Engine
        const campaignResult = await waService.executeBroadcastCampaign(
          { name: campaignName, targetSegment: isPasteSource ? 'Pasted Numbers' : 'Selected Group' },
          targetRecipients,
          activeTemplateObj,
          { '1': 'Customer' },
          posterUrl,
          (progress) => {
            document.getElementById('dispatch-progress-fill').style.width = `${progress.percentage}%`;
            document.getElementById('dispatch-status-text').innerText = `Sending to ${progress.lastProcessed} (${progress.current}/${progress.total})...`;
            document.getElementById('dispatch-stat-sent').innerText = progress.sentCount;
            document.getElementById('dispatch-stat-read').innerText = progress.readCount;
            document.getElementById('dispatch-stat-failed').innerText = progress.failedCount;
          }
        );

        campaigns.unshift(campaignResult);
        localStorage.setItem('miraya_campaigns', JSON.stringify(campaigns));

        setTimeout(() => {
          closeModal('dispatch-progress-modal');
          renderOverviewMetrics();
          renderCampaignHistory();
          renderQuickLinks();
          alert(`🎉 WhatsApp Broadcast "${campaignName}" Ek Saath ${campaignResult.sent} Logo ko Bhej Diya Gaya hai!`);
        }, 600);
      });
    }
  }

  // Render Direct WhatsApp Click Links for 1-Click Messaging
  function renderQuickLinks() {
    const container = document.getElementById('quick-links-list');
    if (!container) return;

    const sampleMsg = encodeURIComponent("✨ You’re Invited! Miraya is bringing you an exclusive new collection. We’d love to have you with us!");

    container.innerHTML = customers.slice(0, 10).map(c => {
      const cleanPhone = c.phone.replace(/[^0-9]/g, '');
      const link = `https://wa.me/${cleanPhone}?text=${sampleMsg}`;
      return `
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:8px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.85rem; font-weight:600;">${c.name}</div>
            <div style="font-size:0.72rem; color:var(--text-muted);">${c.phone}</div>
          </div>
          <a href="${link}" target="_blank" class="btn btn-primary btn-sm" style="padding:4px 10px; font-size:0.75rem; text-decoration:none;">
            <i class="fa-brands fa-whatsapp"></i> Send Direct
          </a>
        </div>
      `;
    }).join('');
  }

  let savedAccounts = [];

  // Multi-Owner Accounts Management Logic
  async function fetchOwnerAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        savedAccounts = await res.json();
        renderOwnerAccountDropdowns();
      }
    } catch (e) {
      console.log('Account fetch error, standalone mode active');
    }
  }

  function renderOwnerAccountDropdowns() {
    const senderSelect = document.getElementById('sender-account-select');
    const modalSwitcher = document.getElementById('modal-account-switcher');

    if (senderSelect) {
      if (savedAccounts.length === 0) {
        senderSelect.innerHTML = `<option value="DEFAULT">Default Meta API Account (${waService.phoneId || 'Unconfigured'})</option>`;
      } else {
        senderSelect.innerHTML = savedAccounts.map(acc => `
          <option value="${acc.id}" ${acc.is_default ? 'selected' : ''}>
            ${acc.profile_name} (Phone ID: ${acc.phone_id}) ${acc.is_default ? '★ Active Default' : ''}
          </option>
        `).join('');
      }
    }

    if (modalSwitcher) {
      let optionsHtml = savedAccounts.map(acc => `
        <option value="${acc.id}" ${acc.is_default ? 'selected' : ''}>
          ${acc.profile_name} (${acc.phone_id}) ${acc.is_default ? '★ Active Default' : ''}
        </option>
      `).join('');
      optionsHtml += `<option value="NEW">+ Create New Owner Account</option>`;
      modalSwitcher.innerHTML = optionsHtml;
    }
  }

  await fetchOwnerAccounts();

  // Modal Handlers
  async function initAPIConfigModal() {
    const accountIdInput = document.getElementById('wa-account-id');
    const profileNameInput = document.getElementById('wa-profile-name-input');
    const tokenInput = document.getElementById('wa-api-token-input');
    const phoneInput = document.getElementById('wa-phone-id-input');
    const wabaInput = document.getElementById('wa-waba-id-input');
    const modalSwitcher = document.getElementById('modal-account-switcher');
    const saveBtn = document.getElementById('save-api-config-btn');
    const deleteBtn = document.getElementById('delete-account-btn');

    function populateFormForAccount(acc) {
      if (!acc) {
        if (accountIdInput) accountIdInput.value = '';
        if (profileNameInput) profileNameInput.value = 'Owner ' + (savedAccounts.length + 1) + ' Account';
        if (tokenInput) tokenInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (wabaInput) wabaInput.value = '';
        if (deleteBtn) deleteBtn.style.display = 'none';
      } else {
        if (accountIdInput) accountIdInput.value = acc.id;
        if (profileNameInput) profileNameInput.value = acc.profile_name;
        if (tokenInput) tokenInput.value = acc.api_token;
        if (phoneInput) phoneInput.value = acc.phone_id;
        if (wabaInput) wabaInput.value = acc.waba_id || '';
        if (deleteBtn) deleteBtn.style.display = 'inline-block';
      }
    }

    // Default fill active account
    const activeAcc = savedAccounts.find(a => a.is_default) || savedAccounts[0];
    if (activeAcc) {
      populateFormForAccount(activeAcc);
    } else {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const creds = await res.json();
          if (tokenInput) tokenInput.value = creds.apiToken || '';
          if (phoneInput) phoneInput.value = creds.phoneId || '';
          if (wabaInput) wabaInput.value = creds.wabaId || '';
        }
      } catch (e) {}
    }

    if (modalSwitcher) {
      modalSwitcher.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'NEW') {
          populateFormForAccount(null);
        } else {
          const selected = savedAccounts.find(a => a.id == val);
          populateFormForAccount(selected);
        }
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        const id = accountIdInput.value;
        if (!id) return;
        if (confirm('Are you sure you want to delete this Owner Account?')) {
          try {
            await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
            alert('Owner Account deleted!');
            await fetchOwnerAccounts();
            populateFormForAccount(savedAccounts[0] || null);
          } catch (err) {
            alert('Failed to delete account');
          }
        }
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const payload = {
          id: accountIdInput ? accountIdInput.value : '',
          profileName: profileNameInput.value.trim(),
          apiToken: tokenInput.value.trim(),
          phoneId: phoneInput.value.trim(),
          wabaId: wabaInput ? wabaInput.value.trim() : '',
          isDefault: true
        };

        if (!payload.profileName || !payload.apiToken || !payload.phoneId) {
          alert('Please fill in Account Name, API Access Token, and Phone Number ID!');
          return;
        }

        waService.saveConfig(payload.apiToken, payload.phoneId, payload.wabaId);

        try {
          await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiToken: payload.apiToken,
              phoneId: payload.phoneId,
              wabaId: payload.wabaId,
              profileName: payload.profileName
            })
          });
        } catch (err) {
          console.error('Database save warning:', err.message);
        }

        alert(`🎉 Owner Account "${payload.profileName}" saved to Neon DB & Local Storage successfully!`);
        await fetchOwnerAccounts();
        closeModal('api-config-modal');
      });
    }
  }

  function initModals() {
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-open-modal');
        openModal(modalId);
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  async function showCampaignLogsModal(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId);
    const modalTitle = document.getElementById('logs-modal-title');
    const logsContainer = document.getElementById('campaign-logs-table-body');
    if (!modalTitle || !logsContainer) return;

    modalTitle.innerText = `Delivery Log: ${campaign ? campaign.name : campaignId} (${campaignId})`;
    logsContainer.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading logs from Neon Database...</td></tr>`;
    openModal('campaign-logs-modal');

    let logs = [];
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/logs`);
      if (res.ok) {
        const dbLogs = await res.json();
        logs = dbLogs.map(l => ({
          msgId: l.msg_id,
          customerName: l.customer_name,
          phone: l.phone,
          status: l.status,
          timestamp: new Date(l.timestamp).toLocaleTimeString()
        }));
      }
    } catch (e) {
      if (campaign) logs = campaign.logs || [];
    }

    if (logs.length === 0) {
      logsContainer.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No log details stored for this campaign.</td></tr>`;
    } else {
      logsContainer.innerHTML = logs.map(l => `
        <tr>
          <td><span style="font-family:monospace; font-size:0.75rem;">${l.msgId}</span></td>
          <td><strong>${l.customerName}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${l.phone}</span></td>
          <td><span class="badge badge-${(l.status || 'sent').toLowerCase()}">${l.status}</span></td>
          <td>${l.timestamp}</td>
        </tr>
      `).join('');
    }
  }
});
