(() => {
  let state, csrf;
  const c = document.querySelector('#content'),
        t = document.querySelector('#title'),
        e = (a, b) => { let x = document.createElement(a); x.textContent = b; return x },
        api = async (u, o={}) => {
          let r;
          try {
            r = await fetch(u, {...o, headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,...o.headers}});
          } catch (networkErr) {
            throw new Error('Cannot reach the server. Make sure the admin server is running at http://localhost:8787');
          }
          if (r.status === 401) { location.replace('/'); return; }
          let b;
          try { b = await r.json(); } catch { throw new Error('Server returned an unexpected response (status ' + r.status + ')'); }
          if (!r.ok) throw new Error(b.error || 'Request failed');
          return b;
        },
        btn = (x, f) => { let b = e('button', x); b.onclick = f; return b },
        row = a => { let d = document.createElement('div'); d.className='record'; a.forEach(x=>d.append(x)); return d },
        info = (h, v) => { let d = document.createElement('div'); d.className='message-detail'; d.append(e('small',h), e('p',v||'Not provided')); return d };

  /* ─── Helpers ─────────────────────────────────────────────── */
  function fieldGroup(label, inputEl, hint='') {
    const wrap = document.createElement('div');
    wrap.className = 'form-group';
    const lbl = e('label', label);
    wrap.append(lbl, inputEl);
    if (hint) { const h = e('small', hint); h.className = 'form-hint'; wrap.append(h); }
    return wrap;
  }

  function makeInput(type='text', placeholder='', value='') {
    const inp = document.createElement('input');
    inp.type = type; inp.placeholder = placeholder; inp.value = value;
    inp.className = 'form-input';
    return inp;
  }

  function makeTextarea(placeholder='', value='') {
    const ta = document.createElement('textarea');
    ta.placeholder = placeholder; ta.value = value;
    ta.className = 'form-input form-textarea';
    return ta;
  }

  function errMsg(text='') {
    const p = document.createElement('p');
    p.className = 'form-error'; p.textContent = text;
    return p;
  }

  function imgPreview(src='') {
    const wrap = document.createElement('div');
    wrap.className = 'img-preview-wrap';
    const img = document.createElement('img');
    img.className = 'img-preview';
    img.src = src || '';
    img.style.display = src ? 'block' : 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'img-preview-placeholder';
    placeholder.textContent = '🖼 No image selected';
    placeholder.style.display = src ? 'none' : 'flex';
    wrap.append(img, placeholder);
    return { wrap, img, placeholder };
  }

  /* ─── Generic modal scaffold ──────────────────────────────── */
  function createModal(titleText) {
    const shade = document.createElement('div');
    shade.className = 'detail-shade';
    const box = document.createElement('section');
    box.className = 'detail-modal form-modal';
    const closeBtn = btn('×', () => shade.remove());
    closeBtn.className = 'detail-close';
    const heading = e('h2', titleText);
    heading.className = 'modal-title';
    box.append(closeBtn, heading);
    shade.append(box);
    shade.onclick = z => { if (z.target === shade) shade.remove(); };
    document.body.append(shade);
    return { shade, box };
  }

  /* ─── Inquiry / quote detail modal ───────────────────────── */
  function modal(r, label) {
    const { shade, box } = createModal(label);
    [['FULL NAME',r.name],['COMPANY',r.company],['PHONE NUMBER',r.phone],['EMAIL ADDRESS',r.email],
      [label==='Quote requester'?'CARGO REQUIREMENTS':'CUSTOMER MESSAGE',r.message]]
      .forEach(v => box.append(info(v[0],v[1])));
  }

  /* ─── Team modal (Add / Edit) ─────────────────────────────── */
  function teamModal(r = null) {
    const isEdit = !!r;
    const { shade, box } = createModal(isEdit ? 'Edit Team Member' : 'Add Team Member');

    const nameInput = makeInput('text', 'e.g. John Smith', r?.name || '');
    const roleInput = makeInput('text', 'e.g. Operations Manager', r?.role || '');

    const preview = imgPreview(r?.image || '');
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.className = 'file-input';
    const fileBtn = document.createElement('label');
    fileBtn.className = 'file-btn';
    fileBtn.textContent = 'Choose Photo';
    fileBtn.style.cursor = 'pointer';
    const fileId = 'team-img-' + Date.now();
    fileInput.id = fileId; fileBtn.htmlFor = fileId;

    fileInput.addEventListener('change', () => {
      if (!fileInput.files[0]) return;
      const reader = new FileReader();
      reader.onload = () => {
        preview.img.src = reader.result;
        preview.img.style.display = 'block';
        preview.placeholder.style.display = 'none';
      };
      reader.readAsDataURL(fileInput.files[0]);
    });

    const imgWrap = document.createElement('div');
    imgWrap.className = 'img-upload-area';
    imgWrap.append(preview.wrap, fileBtn, fileInput);

    const err = errMsg();
    const saveBtn = btn(isEdit ? 'Save Changes' : 'Add Team Member', async () => {
      err.textContent = '';
      if (!nameInput.value.trim()) { err.textContent = 'Name is required.'; return; }
      if (!roleInput.value.trim()) { err.textContent = 'Role is required.'; return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        let imageStr = r?.image || '';
        if (fileInput.files[0]) {
          const reader = new FileReader();
          imageStr = await new Promise(res => { reader.onload = () => res(reader.result); reader.readAsDataURL(fileInput.files[0]); });
        }
        if (isEdit) {
          await api('/api/admin/team/' + r.id, { method:'PATCH', body: JSON.stringify({ name: nameInput.value.trim(), role: roleInput.value.trim(), image: imageStr }) });
        } else {
          await api('/api/admin/team', { method:'POST', body: JSON.stringify({ name: nameInput.value.trim(), role: roleInput.value.trim(), image: imageStr }) });
        }
        shade.remove();
        load('team');
      } catch(ex) {
        err.textContent = ex.message;
        saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Team Member';
      }
    });
    saveBtn.className = 'modal-save-btn';

    const cancelBtn = btn('Cancel', () => shade.remove());
    cancelBtn.className = 'modal-cancel-btn';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.append(cancelBtn, saveBtn);

    box.append(
      fieldGroup('Full Name *', nameInput),
      fieldGroup('Job Title / Role *', roleInput),
      fieldGroup('Profile Photo', imgWrap, 'JPG, PNG or WebP. Max ~2 MB.'),
      err,
      actions
    );
  }

  /* ─── Service modal (Add / Edit) ─────────────────────────── */
  function serviceModal(r = null) {
    const isEdit = !!r;
    const { shade, box } = createModal(isEdit ? 'Edit Service' : 'Add Service');

    const nameInput  = makeInput('text', 'e.g. Air Freight', r?.name || '');
    const titleInput = makeInput('text', 'e.g. Fast & Reliable Air Cargo Solutions', r?.title || '');
    const descInput  = makeTextarea('Describe this service in a few sentences…', r?.description || '');

    const preview = imgPreview(r?.image || '');
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.className = 'file-input';
    const fileBtn = document.createElement('label');
    fileBtn.className = 'file-btn';
    fileBtn.textContent = 'Choose Image';
    fileBtn.style.cursor = 'pointer';
    const fileId = 'svc-img-' + Date.now();
    fileInput.id = fileId; fileBtn.htmlFor = fileId;

    fileInput.addEventListener('change', () => {
      if (!fileInput.files[0]) return;
      const reader = new FileReader();
      reader.onload = () => {
        preview.img.src = reader.result;
        preview.img.style.display = 'block';
        preview.placeholder.style.display = 'none';
      };
      reader.readAsDataURL(fileInput.files[0]);
    });

    const imgWrap = document.createElement('div');
    imgWrap.className = 'img-upload-area';
    imgWrap.append(preview.wrap, fileBtn, fileInput);

    const err = errMsg();
    const saveBtn = btn(isEdit ? 'Save Changes' : 'Add Service', async () => {
      err.textContent = '';
      if (!nameInput.value.trim()) { err.textContent = 'Short name is required (used in quote dropdown).'; return; }
      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        let imageStr = r?.image || '';
        if (fileInput.files[0]) {
          const reader = new FileReader();
          imageStr = await new Promise(res => { reader.onload = () => res(reader.result); reader.readAsDataURL(fileInput.files[0]); });
        }
        if (isEdit) {
          await api('/api/admin/services/' + encodeURIComponent(r.id), { method:'PATCH', body: JSON.stringify({ name: nameInput.value.trim(), title: titleInput.value.trim(), description: descInput.value.trim(), image: imageStr }) });
        } else {
          await api('/api/admin/services', { method:'POST', body: JSON.stringify({ name: nameInput.value.trim(), title: titleInput.value.trim(), description: descInput.value.trim(), image: imageStr }) });
        }
        shade.remove();
        load('services');
      } catch(ex) {
        err.textContent = ex.message;
        saveBtn.disabled = false; saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Service';
      }
    });
    saveBtn.className = 'modal-save-btn';

    const cancelBtn = btn('Cancel', () => shade.remove());
    cancelBtn.className = 'modal-cancel-btn';

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.append(cancelBtn, saveBtn);

    box.append(
      fieldGroup('Short Name *', nameInput, 'Used in the "Request a Quote" service dropdown.'),
      fieldGroup('Headline / Title', titleInput, 'Displayed as the service heading on the website.'),
      fieldGroup('Description', descInput, 'Short paragraph shown on the services page.'),
      fieldGroup('Service Image', imgWrap, 'JPG, PNG or WebP. Shown alongside the service description.'),
      err,
      actions
    );
  }

  /* ─── Load & render ───────────────────────────────────────── */
  async function load(v='overview') {
    state = await api('/api/admin/data');
    render(v);
  }

  function render(v) {
    c.replaceChildren();
    t.textContent = v[0].toUpperCase() + v.slice(1);
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));

    if (v === 'overview') {
      let cards = document.createElement('section'); cards.className = 'cards';
      [['QUOTE REQUESTS', state.quotes.length], ['CUSTOMERS', state.customers.length], ['CONTACT MESSAGES', state.messages.length]].forEach(a => {
        let q = document.createElement('article'); q.className = 'card';
        q.append(e('small', a[0]), e('b', a[1])); cards.append(q);
      });
      c.append(cards); return;
    }

    if (v === 'quotes') {
      c.append(e('p', "Each request includes the customer's cargo requirements."));
      let dbtn = btn('Download Quote Requests', async () => {
        dbtn.disabled = true; dbtn.textContent = 'Downloading…';
        try { let res = await fetch('/api/admin/export/quotes', {headers:{'X-CSRF-Token':csrf}}); if(!res.ok)throw new Error("Download failed"); let blob=await res.blob(); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='quote-requests.xls'; a.click(); } catch(err){alert(err.message);}
        finally { dbtn.disabled = false; dbtn.textContent = 'Download Quote Requests'; }
      });
      dbtn.className = 'export-btn'; c.append(dbtn);
      if (!state.quotes.length) return c.append(e('p', 'No quote requests yet.'));
      state.quotes.forEach(q => {
        let s = document.createElement('select');
        ['Pending','In Review','Approved','Completed','Cancelled'].forEach(x => { let o = e('option',x); o.selected = x===q.status; s.append(o); });
        s.onchange = () => api('/api/admin/quotes/'+q.id, {method:'PATCH', body:JSON.stringify({status:s.value})}).then(()=>load('quotes'));
        let view = btn('View details', () => modal(q, 'Quote requester')); view.className = 'view-details';
        c.append(row([e('b',q.name), e('span',q.service+' · '+q.email), info('CARGO REQUIREMENTS',q.message), s, view, btn('Delete', () => confirm('Delete this quote permanently?') && api('/api/admin/quotes/'+q.id,{method:'DELETE'}).then(()=>load('quotes')))]));
      }); return;
    }

    if (v === 'messages') {
      c.append(e('p', 'Contact messages are kept separate from quote cargo requirements.'));
      let dbtn = btn('Download Contact Messages', async () => {
        dbtn.disabled = true; dbtn.textContent = 'Downloading…';
        try { let res = await fetch('/api/admin/export/messages', {headers:{'X-CSRF-Token':csrf}}); if(!res.ok)throw new Error("Download failed"); let blob=await res.blob(); let a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='contact-messages.xls'; a.click(); } catch(err){alert(err.message);}
        finally { dbtn.disabled = false; dbtn.textContent = 'Download Contact Messages'; }
      });
      dbtn.className = 'export-btn'; c.append(dbtn);
      if (!state.messages.length) return c.append(e('p', 'No contact messages yet.'));
      state.messages.forEach(m => {
        let view = btn('View details', () => modal(m, 'Contact message sender')); view.className = 'view-details';
        c.append(row([e('b',m.name+(m.read?'':' • New')), e('span',m.email+' · '+(m.company||'No company')), info('CUSTOMER MESSAGE',m.message), view, btn(m.read?'Mark unread':'Mark read', ()=>api('/api/admin/messages/'+m.id,{method:'PATCH',body:JSON.stringify({read:!m.read})}).then(()=>load('messages'))), btn('Delete', ()=>confirm('Delete this message permanently?')&&api('/api/admin/messages/'+m.id,{method:'DELETE'}).then(()=>load('messages')))]));
      }); return;
    }

    if (v === 'customers') {
      state.customers.forEach(x => c.append(row([e('b',x.name), e('span',x.email+' · '+(x.company||'No company')), e('small',x.quotes+' quotes · '+x.messages+' messages')])));
      return;
    }

    /* ── Services ── */
    if (v === 'services') {
      const toolbar = document.createElement('div');
      toolbar.className = 'section-toolbar';
      const addBtn = btn('+ Add Service', () => serviceModal());
      addBtn.className = 'toolbar-add-btn';
      const hint = e('p', state.services.length === 0 ? 'No services added yet. Click "+ Add Service" to create your first one.' : `${state.services.length} service${state.services.length !== 1 ? 's' : ''}`);
      hint.className = 'section-hint';
      toolbar.append(addBtn);
      c.append(toolbar, hint);

      const grid = document.createElement('div');
      grid.className = 'content-grid';

      state.services.forEach(x => {
        if (typeof x === 'string') x = { id: encodeURIComponent(x), name: x, title: x, description: '' };

        const card = document.createElement('div');
        card.className = 'content-card';

        const imgBox = document.createElement('div');
        imgBox.className = 'content-card-img';
        const img = document.createElement('img');
        img.src = x.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50"%3E%3Crect width="80" height="50" fill="%23e9f0ea"/%3E%3Ctext x="40" y="30" text-anchor="middle" fill="%23b0c0b3" font-size="10"%3ENo image%3C/text%3E%3C/svg%3E';
        img.alt = x.title || x.name;
        imgBox.append(img);

        const body = document.createElement('div');
        body.className = 'content-card-body';

        const name = e('strong', x.name);
        name.className = 'content-card-name';
        const title = e('p', x.title || '');
        title.className = 'content-card-title';
        const desc = e('p', x.description ? (x.description.length > 80 ? x.description.slice(0,80)+'…' : x.description) : '');
        desc.className = 'content-card-desc';

        const cardActions = document.createElement('div');
        cardActions.className = 'content-card-actions';
        const editBtn = btn('✏ Edit', () => serviceModal(x));
        editBtn.className = 'card-edit-btn';
        const delBtn = btn('🗑 Delete', () => confirm('Delete this service permanently?') && api('/api/admin/services/'+encodeURIComponent(x.id),{method:'DELETE'}).then(()=>load('services')));
        delBtn.className = 'card-del-btn';
        cardActions.append(editBtn, delBtn);

        body.append(name, title, desc, cardActions);
        card.append(imgBox, body);
        grid.append(card);
      });

      c.append(grid);
      return;
    }

    /* ── Team ── */
    if (v === 'team') {
      const toolbar = document.createElement('div');
      toolbar.className = 'section-toolbar';
      const addBtn = btn('+ Add Team Member', () => teamModal());
      addBtn.className = 'toolbar-add-btn';
      const hint = e('p', state.teams.length === 0 ? 'No team members added yet. Click "+ Add Team Member" to get started.' : `${state.teams.length} team member${state.teams.length !== 1 ? 's' : ''}`);
      hint.className = 'section-hint';
      toolbar.append(addBtn);
      c.append(toolbar, hint);

      const grid = document.createElement('div');
      grid.className = 'content-grid';

      state.teams.forEach(x => {
        const card = document.createElement('div');
        card.className = 'content-card team-card';

        const imgBox = document.createElement('div');
        imgBox.className = 'content-card-img team-img';
        const img = document.createElement('img');
        img.src = x.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23c8d9cb"%3E%3Ccircle cx="12" cy="8" r="4"/%3E%3Cpath d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/%3E%3C/svg%3E';
        img.alt = x.name;
        imgBox.append(img);

        const body = document.createElement('div');
        body.className = 'content-card-body';

        const name = e('strong', x.name);
        name.className = 'content-card-name';
        const role = e('p', x.role);
        role.className = 'content-card-title';

        const cardActions = document.createElement('div');
        cardActions.className = 'content-card-actions';
        const editBtn = btn('✏ Edit', () => teamModal(x));
        editBtn.className = 'card-edit-btn';
        const delBtn = btn('🗑 Delete', () => confirm('Delete this team member?') && api('/api/admin/team/'+x.id,{method:'DELETE'}).then(()=>load('team')));
        delBtn.className = 'card-del-btn';
        cardActions.append(editBtn, delBtn);

        body.append(name, role, cardActions);
        card.append(imgBox, body);
        grid.append(card);
      });

      c.append(grid);
      return;
    }

    if (v === 'settings') {
      const wrap = document.createElement('div');
      wrap.className = 'settings-wrap';

      /* ── Section builder helper ── */
      function settingsCard(iconSvg, cardTitle, cardSubtitle) {
        const card = document.createElement('div');
        card.className = 'settings-card';
        const cardHead = document.createElement('div');
        cardHead.className = 'settings-card-head';
        const icon = document.createElement('div');
        icon.className = 'settings-card-icon';
        icon.innerHTML = iconSvg;
        const headText = document.createElement('div');
        const ht = e('h3', cardTitle); ht.className = 'settings-card-title';
        const hs = e('p', cardSubtitle); hs.className = 'settings-card-subtitle';
        headText.append(ht, hs);
        cardHead.append(icon, headText);
        card.append(cardHead);
        return card;
      }

      /* ── 1. General Settings ── */
      const generalCard = settingsCard(
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>`,
        'General Settings',
        'Company name and notification preferences'
      );
      const companyInput  = makeInput('text',  'e.g. YM Logistics',           state.settings.companyName          || '');
      const emailInput    = makeInput('email', 'e.g. alerts@ymlogistics.com', state.settings.notificationEmail    || '');
      const waInput       = makeInput('tel',   'e.g. +251911000000',           state.settings.notificationWhatsApp || '');
      const generalErr    = errMsg();
      const generalSaveBtn = document.createElement('button');
      generalSaveBtn.className = 'settings-save-btn'; generalSaveBtn.textContent = 'Save Settings';
      generalSaveBtn.onclick = async () => {
        generalErr.textContent = '';
        generalSaveBtn.disabled = true; generalSaveBtn.textContent = 'Saving…';
        try {
          await api('/api/admin/settings', {
            method: 'PATCH',
            body: JSON.stringify({
              companyName:          companyInput.value.trim(),
              notificationEmail:    emailInput.value.trim(),
              notificationWhatsApp: waInput.value.trim(),
            })
          });
          generalSaveBtn.textContent = '✓ Saved';
          setTimeout(() => { generalSaveBtn.disabled = false; generalSaveBtn.textContent = 'Save Settings'; }, 2000);
        } catch(ex) {
          generalErr.textContent = ex.message;
          generalSaveBtn.disabled = false; generalSaveBtn.textContent = 'Save Settings';
        }
      };
      const generalFields = document.createElement('div');
      generalFields.className = 'settings-fields';
      generalFields.append(
        fieldGroup('Company Name', companyInput),
        fieldGroup('Notification Email', emailInput,
          'Receive an email alert when a new quote request or contact message arrives.'),
        fieldGroup('WhatsApp Notification Number', waInput,
          'Include country code, e.g. +251911000000. Requires Twilio — see .env for setup.'),
        generalErr,
        generalSaveBtn
      );
      generalCard.append(generalFields);

      /* ── 2. Credentials ── */
      const credCard = settingsCard(
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        'Admin Credentials',
        'Update your login username and password'
      );
      const uInput = makeInput('text', 'Username', state.settings.username || 'admin');
      uInput.autocomplete = 'username';
      const pInput = makeInput('password', 'New password (min 14 chars)');
      pInput.autocomplete = 'new-password';
      const cInput = makeInput('password', 'Confirm new password');
      cInput.autocomplete = 'new-password';
      const credErr = errMsg();
      const credSaveBtn = document.createElement('button');
      credSaveBtn.className = 'settings-save-btn'; credSaveBtn.textContent = 'Update Credentials';
      credSaveBtn.onclick = async () => {
        credErr.textContent = '';
        if (!uInput.value.trim()) { credErr.textContent = 'Username is required.'; return; }
        if (pInput.value !== cInput.value) { credErr.textContent = 'Passwords do not match.'; return; }
        if (pInput.value.length < 14) { credErr.textContent = 'Password must be at least 14 characters.'; return; }
        credSaveBtn.disabled = true; credSaveBtn.textContent = 'Updating…';
        try {
          await api('/api/admin/credentials', { method:'POST', body: JSON.stringify({ username: uInput.value.trim(), password: pInput.value }) });
          const note = document.createElement('div');
          note.className = 'settings-notice settings-notice--info';
          note.innerHTML = '🔐 <strong>Credentials updated.</strong> You\'ll be redirected to log in again…';
          credCard.append(note);
          setTimeout(() => location.replace('/'), 2000);
        } catch(ex) {
          credErr.textContent = ex.message;
          credSaveBtn.disabled = false; credSaveBtn.textContent = 'Update Credentials';
        }
      };
      const pwHint = document.createElement('div');
      pwHint.className = 'settings-pw-hint';
      pwHint.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#718077" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Changing credentials will immediately log out all active sessions.';
      const credFields = document.createElement('div');
      credFields.className = 'settings-fields';
      credFields.append(
        fieldGroup('Username', uInput),
        fieldGroup('New Password', pInput, 'Minimum 14 characters required.'),
        fieldGroup('Confirm Password', cInput),
        credErr,
        pwHint,
        credSaveBtn
      );
      credCard.append(credFields);

      wrap.append(generalCard, credCard);
      c.append(wrap);
      return;
    }

    c.append(e('p','Use the navigation to manage quote requests, customers, messages, services, and settings.'));
  }

  document.querySelectorAll('#nav button').forEach(b => b.onclick = () => render(b.dataset.view));
  document.querySelector('#logout').onclick = () => api('/api/logout', {method:'POST'}).then(() => location.replace('/'));

  fetch('/api/me').then(async r => { if (!r.ok) return location.replace('/'); csrf = (await r.json()).csrf; load(); });
})();
