import React, { useState, useEffect, useRef } from 'react';

// Static Templates Mock Data (matches original templates)
const TEMPLATES = [
  {
    id: 'miraya_invite',
    title: '✨ Miraya Exclusive Invitation',
    name: 'miraya_exclusive_invitation',
    status: 'APPROVED',
    body: 'Namaste {{1}}!\n\nYou are cordially invited to preview the brand new Festive Collection at Miraya Store. Show this message to receive an exclusive store credit!\n\nLocation: Miraya Main Store, City Road.',
    variables: ['name']
  },
  {
    id: 'miraya_festive_sale',
    title: '🛍️ Miraya Festive Blockbuster Sale',
    name: 'miraya_blockbuster_sale',
    status: 'APPROVED',
    body: 'Dear {{1}},\n\nThe biggest Festive Sale of the season is LIVE at Miraya! Grab FLAT 30% OFF across all poster designer suits, sarees, and kurtis.\n\nShop Online or Visit our outlet now!',
    variables: ['name']
  },
  {
    id: 'miraya_order_shipped',
    title: '🚚 Order Shipped Confirmation',
    name: 'order_shipped_confirmation',
    status: 'APPROVED',
    body: 'Hello {{1}}!\n\nGreat news! Your Miraya order has been dispatched and is on its way. You can track your shipment details via the store dashboard.\n\nThank you for shopping with Miraya!',
    variables: ['name']
  },
  {
    id: 'miraya_festive_invite',
    title: '✨ Miraya Festive Collection Preview',
    name: 'miraya_festive_invite',
    status: 'APPROVED',
    body: 'Namaste {{1}}!\n\nMiraya Store par is season ka sabse bada Festive Collection launch ho chuka hai! 🌸\n\nAapko cordially invite kiya jata hai hamare exclusive collection preview ke liye. Show this message at checkout to get an instant store credit of ₹500! 🛍️\n\n📍 Location: Miraya Main Outlet, City Road.',
    variables: ['name']
  },
  {
    id: 'miraya_grand_opening',
    title: '🛍️ Grand Store Launch / Opening',
    name: 'miraya_grand_opening',
    status: 'APPROVED',
    body: 'Dear {{1}},\n\nMiraya Store is now in your town! 🚀\n\nHamare naye outlet ke GRAND OPENING event me aapka swagat hai! Join us this weekend to experience premium designer suits, sarees, and exclusive apparel.\n\n🎁 Special Opening Offer: FLAT 20% OFF on all purchases above ₹2,999!\n\n📍 Location: Opposite Central Park, City Center.',
    variables: ['name']
  },
  {
    id: 'miraya_vip_exclusive',
    title: '💎 VIP Customer Exclusive',
    name: 'miraya_vip_exclusive',
    status: 'APPROVED',
    body: 'Hello {{1}}!\n\nAs one of our most valued VIP customers, we invite you to an exclusive Pre-Sale Showcase! 🥂\n\nPublic sale shuru hone se pehle aaiye aur apne manpasand designer wear par FLAT 35% discount payein.\n\n✨ Strictly by Invitation only.\n📍 Location: Miraya Boutique Suite, 2nd Floor.',
    variables: ['name']
  },
  {
    id: 'miraya_clearance_sale',
    title: '🛍️ Season End Clearance Sale',
    name: 'miraya_clearance_sale',
    status: 'APPROVED',
    body: 'Dear {{1}},\n\nThe biggest clearance sale of the year is LIVE at Miraya! 💃\n\nUpgrade your wardrobe with premium designer Kurtis, Suits, and Sarees starting at just ₹799.\n\n🔥 FLAT 50% OFF across the entire stock!\n📍 Location: Miraya Fashion Hub.',
    variables: ['name']
  },
  {
    id: 'miraya_bridal_showcase',
    title: '🌸 Bridal & Wedding Collection Showcase',
    name: 'miraya_bridal_showcase',
    status: 'APPROVED',
    body: 'Namaste {{1}}!\n\nShubh Vivah Season ke liye Miraya Bridal Showcase ab open hai! 🌸\n\nExquisite wedding lehengas, bridal sarees, and designer sherwanis ka exclusive collection preview karein. Book a personal stylist session today.\n\n📍 Location: Miraya Bridal Studio, Main Road.',
    variables: ['name']
  }
];

export default function App() {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App State Data
  const [customers, setCustomers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('DEFAULT');
  const [activeOwnerAccount, setActiveOwnerAccount] = useState(null);

  // Modals Visibility State
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isDispatchProgressOpen, setIsDispatchProgressOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Campaign Logs Viewer State
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Quick Broadcast Form State
  const [campaignName, setCampaignName] = useState('');
  const [isPasteSource, setIsPasteSource] = useState(true);
  const [pastedText, setPastedText] = useState('');
  const [campaignSegment, setCampaignSegment] = useState('ALL');
  const [customMessage, setCustomMessage] = useState(TEMPLATES[0].body);
  const [posterUrl, setPosterUrl] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);

  // Dispatch Progress Bar State
  const [dispatchProgress, setDispatchProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    lastProcessed: '',
    sentCount: 0,
    failedCount: 0
  });

  // Settings Modal Forms State
  const [modalAccountId, setModalAccountId] = useState('');
  const [modalProfileName, setModalProfileName] = useState('Default Owner Account');
  const [modalApiToken, setModalApiToken] = useState('');
  const [modalPhoneId, setModalPhoneId] = useState('');
  const [modalWabaId, setModalWabaId] = useState('');
  const [modalAccountSelection, setModalAccountSelection] = useState('NEW');
  const [savingAccount, setSavingAccount] = useState(false);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustTag, setNewCustTag] = useState('Customer');

  // Search Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryFilterSegment, setDirectoryFilterSegment] = useState('ALL');

  // 1. Fetch Owner Accounts from backend
  const fetchOwnerAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setSavedAccounts(data);
        const def = data.find(a => a.is_default) || data[0];
        if (def) {
          setSelectedAccountId(def.id);
          setActiveOwnerAccount(def);
        }
      }
    } catch (e) {
      console.error('Owner accounts load error:', e);
    }
  };

  // 2. Fetch customers and campaigns from database
  const fetchBackendData = async (accId = null) => {
    const targetId = accId || selectedAccountId;
    if (!targetId || targetId === 'DEFAULT') return;

    try {
      const custRes = await fetch(`/api/customers?account_id=${targetId}`);
      if (custRes.ok) {
        const dbCusts = await custRes.json();
        setCustomers(dbCusts || []);
      }

      const campRes = await fetch(`/api/campaigns?account_id=${targetId}`);
      if (campRes.ok) {
        const dbCamps = await campRes.json();
        setCampaigns(dbCamps.map(c => ({
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
        })) || []);
      }
    } catch (e) {
      console.error('Data load exception:', e);
    }
  };

  // Load Initial Settings & Accounts
  useEffect(() => {
    fetchOwnerAccounts();
  }, []);

  // Sync data when active owner account changes
  useEffect(() => {
    if (selectedAccountId !== 'DEFAULT') {
      fetchBackendData(selectedAccountId);
      const active = savedAccounts.find(a => a.id == selectedAccountId);
      if (active) setActiveOwnerAccount(active);
    }
  }, [selectedAccountId, savedAccounts]);

  // Handle Owner switcher select
  const handleOwnerAccountSelectChange = (e) => {
    setSelectedAccountId(e.target.value);
  };

  // Handle owner details configuration selection change
  const handleModalAccountChange = (e) => {
    const val = e.target.value;
    setModalAccountSelection(val);
    if (val === 'NEW') {
      setModalAccountId('');
      setModalProfileName('');
      setModalApiToken('');
      setModalPhoneId('');
      setModalWabaId('');
    } else {
      const match = savedAccounts.find(a => a.id == val);
      if (match) {
        setModalAccountId(match.id);
        setModalProfileName(match.profile_name || '');
        setModalApiToken(match.api_token || '');
        setModalPhoneId(match.phone_id || '');
        setModalWabaId(match.waba_id || '');
      }
    }
  };

  // Reset details configuration modal fields to blank for new creation
  const handleAddNewAccountClick = () => {
    setModalAccountSelection('NEW');
    setModalAccountId('');
    setModalProfileName('');
    setModalApiToken('');
    setModalPhoneId('');
    setModalWabaId('');
  };

  // Save Config Details to database
  const handleSaveOwnerAccount = async (e) => {
    e.preventDefault();
    if (!modalProfileName || !modalPhoneId) {
      alert('Please fill in Account Name and Phone Number ID!');
      return;
    }

    setSavingAccount(true);
    const isCreatingNew = modalAccountSelection === 'NEW' || !modalAccountId;
    const payload = {
      id: isCreatingNew ? '' : modalAccountId,
      profileName: modalProfileName.trim(),
      apiToken: modalApiToken.trim(),
      phoneId: modalPhoneId.trim(),
      wabaId: modalWabaId.trim(),
      isDefault: true
    };

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const savedAcc = await res.json();
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

        alert(`🎉 Owner Account "${payload.profileName}" saved to Neon PostgreSQL Database successfully!`);
        await fetchOwnerAccounts();
        if (savedAcc && savedAcc.id) {
          setSelectedAccountId(savedAcc.id);
        }
        setIsApiConfigOpen(false);
      } else {
        alert('Failed to save account details');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving details');
    } finally {
      setSavingAccount(false);
    }
  };

  // Delete configuration details
  const handleDeleteOwnerAccount = async () => {
    if (!modalAccountId) return;
    if (confirm('Are you sure you want to delete this Owner Account?')) {
      try {
        const res = await fetch(`/api/accounts/${modalAccountId}`, { method: 'DELETE' });
        if (res.ok) {
          alert('Owner Account deleted!');
          await fetchOwnerAccounts();
          setIsApiConfigOpen(false);
        }
      } catch (err) {
        alert('Failed to delete account');
      }
    }
  };

  // Add new customer manually
  const handleSaveCustomer = async () => {
    if (!newCustName || !newCustPhone) {
      alert('Please enter Customer Name and Phone Number!');
      return;
    }

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          tag: newCustTag
        })
      });

      if (res.ok) {
        await fetchBackendData();
        setNewCustName('');
        setNewCustPhone('');
        setIsAddCustomerOpen(false);
        alert(`🎉 Customer "${newCustName}" saved to Owner Directory successfully!`);
      } else {
        const errData = await res.json();
        if (errData.alreadyAdded) {
          alert(`⚠️ Already Added: Yeh phone number is account ke liye pehle se added hai!`);
        } else {
          alert(`Error: ${errData.error || 'Failed to save customer'}`);
        }
      }
    } catch (e) {
      alert('Save customer failed');
    }
  };

  // Delete customer record from Neon DB
  const handleDeleteCustomer = async (id) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setCustomers(prev => prev.filter(c => c.id != id));
        }
      } catch (e) {
        alert('Failed to delete customer');
      }
    }
  };

  // Format Template helper
  const formatTemplateMessage = (bodyText, customerName) => {
    return bodyText.replace(/{{1}}/g, customerName).replace(/{{name}}/g, customerName);
  };

  // Send single message HTTP call to Meta
  const sendSingleWhatsAppMessage = async (recipientPhone, messageText, mediaId, phoneId, apiToken) => {
    if (!apiToken || !phoneId) {
      // Simulated sandbox dispatch
      return { success: true, messageId: 'WAMID.' + Math.random().toString(36).substring(2, 10).toUpperCase() };
    }

    let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
    let payload = {};

    if (mediaId) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "image",
        image: { id: mediaId, caption: messageText }
      };
    } else if (posterUrl && (posterUrl.startsWith('http://') || posterUrl.startsWith('https://'))) {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "image",
        image: { link: posterUrl, caption: messageText }
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: messageText }
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.messages && data.messages.length > 0) {
        return { success: true, messageId: data.messages[0].id };
      } else {
        return { success: false, error: data.error ? data.error.message : 'Meta API Failed' };
      }
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Execute entire broadcast campaign loop
  const handleLaunchCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName) {
      alert('Please enter a Campaign Name!');
      return;
    }

    let targetRecipients = [];
    if (isPasteSource) {
      if (!pastedText.trim()) {
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
        return { name, phone, tag: 'Quick Broadcast' };
      });

      // Import pasted contacts to Neon DB
      try {
        await fetch('/api/customers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account_id: selectedAccountId, customers: targetRecipients })
        });
      } catch (err) {}
    } else {
      if (campaignSegment === 'ALL') {
        targetRecipients = customers;
      } else {
        targetRecipients = customers.filter(c => c.tag === campaignSegment);
      }
    }

    if (targetRecipients.length === 0) {
      alert('No valid recipients found to send broadcast!');
      return;
    }

    setIsDispatchProgressOpen(true);
    const total = targetRecipients.length;

    // Load active Meta configuration
    const activeCreds = activeOwnerAccount || { api_token: '', phone_id: '' };
    const apiToken = activeCreds.api_token || '';
    const phoneId = activeCreds.phone_id || '';

    // Step 1: Pre-upload Base64 poster if uploaded
    let metaMediaId = null;
    if (posterUrl && posterUrl.startsWith('data:image')) {
      try {
        const base64Data = posterUrl.split(',')[1];
        const blob = await (await fetch(posterUrl)).blob();
        const formData = new FormData();
        formData.append('poster', blob, 'poster.jpg');
        formData.append('account_id', selectedAccountId);
        
        const mediaRes = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData
        });
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          metaMediaId = mediaData.metaMediaId;
        }
      } catch (e) {
        console.error('Base64 upload failed:', e);
      }
    }

    let sent = 0;
    let failed = 0;
    const campaignId = 'CMP-' + Date.now().toString().slice(-6);
    const tempLogs = [];

    // Step 2: Message Send Loop
    for (let i = 0; i < total; i++) {
      const recipient = targetRecipients[i];
      const messageText = formatTemplateMessage(customMessage, recipient.name);
      
      setDispatchProgress({
        current: i + 1,
        total,
        percentage: Math.round(((i + 1) / total) * 100),
        lastProcessed: recipient.name,
        sentCount: sent,
        failedCount: failed
      });

      const res = await sendSingleWhatsAppMessage(recipient.phone, messageText, metaMediaId, phoneId, apiToken);
      
      if (res.success) {
        sent++;
      } else {
        failed++;
      }

      tempLogs.push({
        msgId: res.messageId || ('ERR.' + Math.random().toString(36).substring(2, 8)),
        customerName: recipient.name,
        phone: recipient.phone,
        status: res.success ? 'SENT' : 'FAILED',
        messageText: messageText,
        errorDetails: res.error || null
      });

      setDispatchProgress(prev => ({
        ...prev,
        sentCount: sent,
        failedCount: failed
      }));

      // Throttle delay
      await new Promise(r => setTimeout(r, 100));
    }

    // Step 3: Save logs to Neon DB with logOnly mode
    try {
      await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccountId,
          name: campaignName,
          targetSegment: isPasteSource ? 'Pasted Numbers' : 'Selected Group',
          recipients: targetRecipients,
          message: customMessage,
          posterUrl,
          logOnly: true,
          campaignId,
          sentCount: sent,
          deliveredCount: sent,
          readCount: sent,
          failedCount: failed,
          logs: tempLogs
        })
      });
      await fetchBackendData();
    } catch (e) {
      console.error('Logs saving failed:', e);
    }

    setTimeout(() => {
      setIsDispatchProgressOpen(false);
      setCampaignName('');
      setPastedText('');
      alert(`🎉 WhatsApp Broadcast "${campaignName}" Ek Saath ${sent} Logo ko Bhej Diya Gaya hai!`);
    }, 600);
  };

  // Open campaign logs detail modal
  const handleOpenLogsModal = async (campaignId) => {
    setSelectedCampaignId(campaignId);
    setIsLogsOpen(true);
    setLoadingLogs(true);
    setCampaignLogs([]);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/logs`);
      if (res.ok) {
        const data = await res.json();
        setCampaignLogs(data);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Handle poster file upload
  const handlePosterUploadChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPosterUrl(evt.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Switch Template selection
  const selectTemplateCard = (t) => {
    setSelectedTemplate(t);
    setCustomMessage(t.body);
  };

  // Unique Customer tags list
  const uniqueTags = [...new Set(customers.map(c => c.tag).filter(Boolean))];

  // Directory filter search query
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.phone.includes(searchQuery) ||
                          (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSegment = directoryFilterSegment === 'ALL' || c.tag === directoryFilterSegment;
    return matchesSearch && matchesSegment;
  });

  // Calculate Overview Stats
  const totalSentMessages = campaigns.reduce((acc, curr) => acc + curr.sent, 0);
  const totalDeliveredMessages = campaigns.reduce((acc, curr) => acc + curr.delivered, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. Header component */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-section">
            <div className="brand-icon">
              <i className="fa-brands fa-whatsapp"></i>
            </div>
            <div className="brand-title">
              <h1>Broadcast Miraya</h1>
              <div className="brand-subtitle">WhatsApp Business Campaign Manager</div>
            </div>
          </div>
          
          <div className="header-actions">
            {/* Active Switcher Dropdown */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <i className="fa-solid fa-store" style={{ color: 'var(--accent-gold)' }}></i>
              <select 
                id="sender-account-select" 
                className="form-control" 
                style={{ width: '220px', padding: '5px 10px', fontSize: '0.85rem' }}
                value={selectedAccountId}
                onChange={handleOwnerAccountSelectChange}
              >
                {savedAccounts.length === 0 ? (
                  <option value="DEFAULT">Default Meta API Account (Unconfigured)</option>
                ) : (
                  savedAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.profile_name} (Phone ID: {acc.phone_id}) {acc.is_default ? '★ Active Default' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button className="mode-badge" onClick={() => setIsApiConfigOpen(true)}>
              <span className="mode-dot"></span>
              <span>API Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="app-nav">
        <div className="nav-container">
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="fa-solid fa-chart-line"></i> Dashboard Overview
          </button>
          <button className={`nav-btn ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
            <i className="fa-solid fa-paper-plane"></i> Quick Broadcast
          </button>
          <button className={`nav-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')}>
            <i className="fa-solid fa-message"></i> Template Manager
          </button>
          <button className={`nav-btn ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => setActiveTab('customers')}>
            <i className="fa-solid fa-address-book"></i> Customer Directory
          </button>
        </div>
      </nav>

      {/* 3. Main panes container */}
      <main className="app-main">

        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="tab-pane active">
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon gold">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="metric-data">
                  <div className="value" id="metric-total-customers">{customers.length}</div>
                  <div className="label">Total Customers</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon green">
                  <i className="fa-solid fa-bullhorn"></i>
                </div>
                <div className="metric-data">
                  <div className="value" id="metric-active-campaigns">{campaigns.length}</div>
                  <div className="label">Broadcast Campaigns</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon blue">
                  <i className="fa-solid fa-paper-plane"></i>
                </div>
                <div className="metric-data">
                  <div className="value" id="metric-messages-sent">{totalSentMessages.toLocaleString()}</div>
                  <div className="label">Total Dispatched</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon purple">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <div className="metric-data">
                  <div className="value">{totalDeliveredMessages.toLocaleString()}</div>
                  <div className="label">Total Delivered</div>
                </div>
              </div>
            </div>

            {/* Campaign History Log Table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><i className="fa-solid fa-history" style={{ color: 'var(--primary-wa)' }}></i> Broadcast History (PostgreSQL DB Logs)</h3>
              </div>
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Campaign ID</th>
                      <th>Campaign Name</th>
                      <th>Target Group</th>
                      <th>Total sent</th>
                      <th>Success</th>
                      <th>Failed</th>
                      <th>Dispatched At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No campaigns dispatched yet. Launch a broadcast to see database logs.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map(c => (
                        <tr key={c.id}>
                          <td><span style={{ fontFamily: 'monospace' }}>{c.id}</span></td>
                          <td><strong>{c.name}</strong></td>
                          <td><span className="tag">{c.targetSegment}</span></td>
                          <td>{c.totalRecipients}</td>
                          <td><span className="badge badge-read">{c.sent}</span></td>
                          <td><span className="badge badge-failed">{c.failed}</span></td>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.createdAt}</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenLogsModal(c.id)}>
                              <i className="fa-solid fa-circle-info"></i> View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Quick Broadcast */}
        {activeTab === 'broadcast' && (
          <div className="tab-pane active">
            <div className="panel-grid">
              
              {/* Broadcast Launch Form */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><i className="fa-solid fa-bullhorn" style={{ color: 'var(--primary-wa)' }}></i> 1-Click Bulk Message Dispatcher</h3>
                </div>
                
                <form onSubmit={handleLaunchCampaign}>
                  <div className="form-group">
                    <label className="form-label">Campaign Reference Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Diwali Premium Collection Invitation"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ marginBottom: '8px' }}>Select Target Audience Source</label>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="audience-source" 
                          checked={isPasteSource}
                          onChange={() => setIsPasteSource(true)}
                        /> Quick-Paste (Name, Phone Number)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="audience-source" 
                          checked={!isPasteSource}
                          onChange={() => setIsPasteSource(false)}
                        /> Saved Owner Customer Directory
                      </label>
                    </div>
                  </div>

                  {isPasteSource ? (
                    <div className="form-group">
                      <label className="form-label">Enter Recipients (Copy-paste Name and Phone Number column from Excel)</label>
                      <textarea 
                        className="form-control" 
                        rows="5"
                        placeholder="Format: Name, Phone&#10;Garima, 918888888888&#10;Yash, 917777777777"
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                      ></textarea>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Select Customer Segment Directory</label>
                      <select 
                        className="form-control"
                        value={campaignSegment}
                        onChange={(e) => setCampaignSegment(e.target.value)}
                      >
                        <option value="ALL">All Customers ({customers.length} total)</option>
                        {uniqueTags.map(t => (
                          <option key={t} value={t}>{t} ({customers.filter(c => c.tag === t).length})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Customize Broadcast Invitation Template (Body)</label>
                    <textarea 
                      className="form-control" 
                      rows="6"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    ></textarea>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      <i className="fa-solid fa-info-circle"></i> Tip: Use <code>{"{{1}}"}</code> as a dynamic placeholder to auto-inject recipient name.
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Attach Invitation Poster Banner (Optional File / Public URL)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="https://example.com/banner.png" 
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <input 
                        type="file" 
                        id="poster-file-upload" 
                        accept="image/*" 
                        onChange={handlePosterUploadChange}
                        style={{ display: 'none' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={() => document.getElementById('poster-file-upload').click()}
                      >
                        <i className="fa-solid fa-cloud-arrow-up"></i> Upload
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}>
                    <i className="fa-solid fa-bullhorn"></i> Start Bulk WhatsApp Broadcast
                  </button>
                </form>
              </div>

              {/* Live Preview Display */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="card-header" style={{ marginBottom: '20px' }}>
                  <h3 className="card-title"><i className="fa-solid fa-mobile-screen-button" style={{ color: 'var(--accent-gold)' }}></i> Live Phone Preview</h3>
                </div>
                
                <div className="phone-mockup">
                  <div className="phone-notch"></div>
                  <div className="wa-screen-header">
                    <div className="wa-avatar">M</div>
                    <div className="wa-contact-info">
                      <div className="wa-contact-info name">Miraya Customer</div>
                      <div className="wa-contact-info status">Online</div>
                    </div>
                  </div>
                  
                  <div className="wa-chat-body">
                    <div className="wa-bubble">
                      <div className="wa-bubble-header">Miraya Invitation</div>
                      {posterUrl && (
                        <img 
                          src={posterUrl} 
                          alt="Poster Preview" 
                          style={{ width: '100%', borderRadius: '8px', marginBottom: '8px', maxHeight: '180px', objectFit: 'cover' }} 
                        />
                      )}
                      <p style={{ whiteSpace: 'pre-line' }}>{formatTemplateMessage(customMessage, 'Customer')}</p>
                      <div className="wa-bubble-time">
                        10:00 AM <i className="fa-solid fa-check-double wa-ticks"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Template Manager */}
        {activeTab === 'templates' && (
          <div className="tab-pane active">
            <div className="panel-grid">
              
              {/* Template cards lists */}
              <div>
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', fontWeight: 700 }}>Select Approved WhatsApp Templates</h3>
                
                {TEMPLATES.map(t => (
                  <div 
                    key={t.id}
                    className={`card template-card ${t.id === selectedTemplate.id ? 'active-template' : ''}`}
                    onClick={() => selectTemplateCard(t)}
                    style={{ 
                      marginBottom: '1rem', 
                      cursor: 'pointer',
                      border: t.id === selectedTemplate.id ? '2px solid var(--primary-wa)' : '1px solid var(--border-color)',
                      boxShadow: t.id === selectedTemplate.id ? '0 0 15px rgba(37, 211, 102, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.title}</h4>
                      <span className="badge badge-read">{t.status}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '8px' }}>
                      Template Name: {t.name}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'pre-line' }}>
                      {t.body}
                    </p>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                      {t.variables.map(v => (
                        <span key={v} className="tag" style={{ fontSize: '0.7rem' }}>{"{{" + v + "}}"}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Template Previewer mockup */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="card-header" style={{ marginBottom: '20px' }}>
                  <h3 className="card-title"><i className="fa-solid fa-mobile-screen-button" style={{ color: 'var(--accent-gold)' }}></i> Template Preview</h3>
                </div>

                <div className="phone-mockup">
                  <div className="phone-notch"></div>
                  <div className="wa-screen-header">
                    <div className="wa-avatar">M</div>
                    <div className="wa-contact-info">
                      <div className="wa-contact-info name">Miraya Customer</div>
                      <div className="wa-contact-info status">Online</div>
                    </div>
                  </div>
                  
                  <div className="wa-chat-body">
                    <div className="wa-bubble">
                      <div className="wa-bubble-header">Miraya Official</div>
                      <p style={{ whiteSpace: 'pre-line' }}>{formatTemplateMessage(selectedTemplate.body, 'Customer')}</p>
                      <div className="wa-bubble-time">
                        10:00 AM <i className="fa-solid fa-check-double wa-ticks"></i>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '20px', width: '100%' }}
                  onClick={() => {
                    setCustomMessage(selectedTemplate.body);
                    setActiveTab('broadcast');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Use This Template
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: Customer Directory */}
        {activeTab === 'customers' && (
          <div className="tab-pane active">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><i className="fa-solid fa-users" style={{ color: 'var(--primary-wa)' }}></i> Owner Customer Directory</h3>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddCustomerOpen(true)}>
                    <i className="fa-solid fa-user-plus"></i> Add Customer
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div className="toolbar">
                <div className="search-box">
                  <i className="fa-solid fa-magnifying-glass search-icon"></i>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search by name or phone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="form-control" 
                    value={directoryFilterSegment}
                    onChange={(e) => setDirectoryFilterSegment(e.target.value)}
                    style={{ width: '160px' }}
                  >
                    <option value="ALL">All Segments</option>
                    {uniqueTags.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customers Directory Table */}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" /></th>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>Segment Tag</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No customers found. Click Add Customer to save contacts to this owner directory.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(c => (
                        <tr key={c.id}>
                          <td><input type="checkbox" /></td>
                          <td><strong>{c.name}</strong><br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {c.id}</span></td>
                          <td>{c.phone}</td>
                          <td><span className="tag">{c.tag || 'Customer'}</span></td>
                          <td>
                            <button className="btn btn-secondary btn-sm delete-cust-btn" onClick={() => handleDeleteCustomer(c.id)}>
                              <i className="fa-solid fa-trash"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* 4. Settings Configuration modal */}
      {isApiConfigOpen && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3><i className="fa-brands fa-whatsapp" style={{ color: 'var(--primary-wa)' }}></i> Meta WhatsApp API Accounts (Multi-Owner Manager)</h3>
              <button className="close-btn" onClick={() => setIsApiConfigOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSaveOwnerAccount}>
              <div className="modal-body">
                {/* Saved Owner switcher */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                    <i className="fa-solid fa-users-gear"></i> Select Active Owner Profile / Business Account:
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select 
                      id="modal-account-switcher" 
                      className="form-control" 
                      style={{ flex: 1 }}
                      value={modalAccountSelection}
                      onChange={handleModalAccountChange}
                    >
                      <option value="NEW">+ Create New Owner Account</option>
                      {savedAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.profile_name} (Phone ID: {acc.phone_id}) {acc.is_default ? '★ Active Default' : ''}
                        </option>
                      ))}
                    </select>
                    
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewAccountClick} style={{ whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-plus"></i> New Account
                    </button>
                    {modalAccountSelection !== 'NEW' && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handleDeleteOwnerAccount} style={{ color: 'var(--status-failed)', whiteSpace: 'nowrap' }}>
                        <i className="fa-solid fa-trash"></i> Delete Account
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Account / Owner Profile Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Garima Miraya store"
                    value={modalProfileName}
                    onChange={(e) => setModalProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Meta Cloud API Access Token</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    placeholder="EAAG..." 
                    value={modalApiToken}
                    onChange={(e) => setModalApiToken(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 10987654321" 
                    value={modalPhoneId}
                    onChange={(e) => setModalPhoneId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Business Account (WABA) ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 9876543210" 
                    value={modalWabaId}
                    onChange={(e) => setModalWabaId(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsApiConfigOpen(false)}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={savingAccount}>
                  {savingAccount ? (
                    <span><i className="fa-solid fa-spinner fa-spin"></i> Saving to Neon DB...</span>
                  ) : (
                    <span><i className="fa-solid fa-floppy-disk"></i> Save Owner Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-user-plus" style={{ color: 'var(--primary-wa)' }}></i> Add Customer to Owner Directory</h3>
              <button className="close-btn" onClick={() => setIsAddCustomerOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Yash" 
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 918180934819" 
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Segment Tag</label>
                <select 
                  className="form-control" 
                  value={newCustTag}
                  onChange={(e) => setNewCustTag(e.target.value)}
                >
                  <option value="Customer">General Customer</option>
                  <option value="VIP Customer">VIP Customer</option>
                  <option value="Wholesale">Wholesale Client</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsAddCustomerOpen(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleSaveCustomer}>
                <i className="fa-solid fa-floppy-disk"></i> Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Broadcast Progress Dispatch Modal */}
      {isDispatchProgressOpen && (
        <div className="modal-overlay active">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-paper-plane" style={{ color: 'var(--primary-wa)' }}></i> Broadcasting Campaign Dispatch...</h3>
            </div>
            
            <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
              <div style={{ fontSize: '3rem', color: 'var(--primary-wa)', marginBottom: '1.25rem' }}>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              </div>
              <h4 id="dispatch-status-text" style={{ marginBottom: '10px' }}>
                Sending to {dispatchProgress.lastProcessed} ({dispatchProgress.current}/{dispatchProgress.total})...
              </h4>
              
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${dispatchProgress.percentage}%` }}></div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }} id="dispatch-stat-sent">{dispatchProgress.sentCount}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sent</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--status-failed)' }} id="dispatch-stat-failed">{dispatchProgress.failedCount}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Failed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. View Details Logs modal */}
      {isLogsOpen && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <div className="modal-header">
              <h3 id="logs-modal-title">Delivery Log Details</h3>
              <button className="close-btn" onClick={() => setIsLogsOpen(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Message ID</th>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th>Dispatched At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLogs ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                          <i className="fa-solid fa-spinner fa-spin"></i> Loading logs from Neon Database...
                        </td>
                      </tr>
                    ) : campaignLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          No delivery log logs stored for this campaign.
                        </td>
                      </tr>
                    ) : (
                      campaignLogs.map(l => (
                        <tr key={l.id}>
                          <td><span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{l.msg_id}</span></td>
                          <td><strong>{l.customer_name}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.phone}</span></td>
                          <td><span className={`badge badge-${(l.status || 'SENT').toLowerCase()}`}>{l.status}</span></td>
                          <td>{new Date(l.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsLogsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
