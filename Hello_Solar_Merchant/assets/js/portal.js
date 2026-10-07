/* Merchant workspace. Samples are separate from real accounts; no server actions. */
(() => {
  'use strict';
  const host = document.getElementById('content');
  if (!host) return;
  const page = location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('en-PH', {style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value);
  const read = key => {try {return localStorage.getItem(key);} catch {return null;}};
  const write = (key, value) => {try {localStorage.setItem(key,value);return true;} catch {return false;}};
  let user; try {user=JSON.parse(read('hello_solar_merchant_user') || '{}');} catch {user={};}
  const account = user?.merchantId || user?.email || user?.username || 'guest';
  const key = 'hello_solar_workspace:' + account;
  let demo = read(key + ':demo') === 'true';
  const projects = [
    {id:'DEMO-101',name:'Sample Home',system:'5.4 kW Hybrid',team:'Demo Team A',stage:'Installation',progress:60,date:'September 18, 2026',next:'Confirm installation access',location:'Sample site · Manila'},
    {id:'DEMO-102',name:'Sample Store',system:'6 kW Hybrid',team:'Unassigned',stage:'Site survey',progress:20,date:'Not scheduled',next:'Arrange a site survey',location:'Sample site · Pasig'},
    {id:'DEMO-103',name:'Sample Villa',system:'10.8 kW Hybrid',team:'Demo Team B',stage:'Completed',progress:100,date:'September 2, 2026',next:'Handover completed',location:'Sample site · Tagaytay'}
  ];
  const payouts = [
    {id:'DEMO-P001',project:'DEMO-103',amount:18000,status:'Paid',date:'September 5, 2026',note:'Sample payout marked paid. This is not a bank confirmation.'},
    {id:'DEMO-P002',project:'DEMO-101',amount:9000,status:'Pending review',date:'Not confirmed',note:'Completion documents are awaiting review in this example.'},
    {id:'DEMO-P003',project:'DEMO-102',amount:4500,status:'On hold',date:'Not confirmed',note:'Site survey is incomplete in this example. Review the installation record.'}
  ];
  const rows = () => demo ? projects : [];
  const payments = () => demo ? payouts : [];
  const link = (href,text,primary=false) => `<a class="action ${primary?'primary':''}" href="${href}">${text}</a>`;
  const badge = status => `<span class="badge ${['Paid','Completed'].includes(status)?'good':'pending'}">${esc(status)}</span>`;
  const empty = (title,description) => `<div class="empty"><strong>${title}</strong>${description}</div>`;
  const stat = (label,value,note) => `<article class="stat"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
  const titles = {dashboard:['Your merchant overview','See what needs attention, then open the relevant workspace.'],payments:['Payments','Review merchant payouts and understand what is pending.'],installers:['Installers & projects','Track installation progress, assigned teams, and the next step.'],support:['How can we help?','Find an answer or prepare a request with the right project details.']};
  const nav = document.querySelectorAll('.nav-link');
  nav.forEach(a => {const active=a.getAttribute('href')===page+'.html';a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  function shell() {
    const [title,subtitle]=titles[page] || titles.dashboard;
    host.innerHTML=`<section class="portal"><div class="page-head"><div><span class="eyebrow">Merchant workspace</span><h1>${title}</h1><p>${subtitle}</p></div><button class="action" id="demo-toggle">${demo?'Hide sample data':'Explore sample data'}</button></div><div class="notice">${demo?'Sample data · Illustrative records only. No real payments, installation updates, or messages are processed.':'No live merchant records are connected yet. Explore sample data to preview these pages.'}</div><div id="workspace"></div><p id="workspace-status" role="status" aria-live="polite"></p></section>`;
    document.getElementById('demo-toggle').onclick=()=>{demo=!demo;write(key+':demo',String(demo));render();};
  }
  function projectTable(list) {
    return list.length?`<div class="table-wrap"><table><caption class="eyebrow">${demo?'Sample installation records':''}</caption><thead><tr><th>Project / system</th><th>Team</th><th>Stage</th><th>Action</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${esc(p.name)}</strong><br>${esc(p.system)}</td><td>${esc(p.team)}</td><td>${badge(p.stage)}</td><td><button class="action" data-project="${p.id}">View project</button></td></tr>`).join('')}</tbody></table></div>`:empty('No installation records','Projects will appear here when merchant data is connected.');
  }
  function dashboard() {
    const active=rows().filter(p=>p.progress<100);
    return `<div class="stats">${stat('Active installations',demo?active.length:'—','Projects still in progress')}${stat('Pending payouts',demo?money(9000):'—','Awaiting review; not yet paid')}${stat('Payouts on hold',demo?money(4500):'—','Review the related project')}${stat('Completed projects',demo?'1':'—','Installation and handover finished')}</div><div class="columns"><section class="panel"><div class="card-head"><div><h2>What needs attention</h2><p>Start with the next action for each project.</p></div></div>${demo?active.map(p=>`<div class="step"><h3>${esc(p.name)}</h3><p>${esc(p.next)} · ${esc(p.stage)}</p>${link('installers.html?project='+p.id,'Review project')}</div>`).join(''):empty('Nothing to review yet','No connected records are available.')}</section><section class="panel"><h2>Your workspaces</h2><div class="step"><h3>Payments</h3><p>Check payout status and download a record list.</p>${link('payments.html','Review payouts')}</div><div class="step"><h3>Installers</h3><p>Find a project, check its team, and review progress.</p>${link('installers.html','View installations')}</div><div class="step"><h3>Support</h3><p>Prepare a request about a payout or installation.</p>${link('support.html','Get help')}</div></section></div><section class="panel"><div class="card-head"><h2>Installation overview</h2>${link('installers.html','View all projects')}</div>${projectTable(rows())}</section>`;
  }
  function paymentPage() {
    return `<div class="stats">${stat('Paid',demo?money(18000):'—','Total in the displayed sample records')}${stat('Pending review',demo?money(9000):'—','Not yet released')}${stat('On hold',demo?money(4500):'—','Further action required')}${stat('Next payout date','Not confirmed','Shown when a release date is available')}</div><section class="panel"><div class="card-head"><div><h2>Payout records</h2><p>These are merchant payouts, not customer electricity bills.</p></div><button class="action" id="export">Download filtered CSV</button></div><div class="tools"><label>Search reference or project<input id="search" type="search" placeholder="e.g. DEMO-P001"></label><label>Payout status<select id="filter"><option>All statuses</option><option>Paid</option><option>Pending review</option><option>On hold</option></select></label></div><div id="results"></div></section><section class="panel"><h2>Understand your payout</h2><p>Pending review means the payout has not been approved. On hold means an issue needs review. Paid describes the recorded status; contact support if it does not match your records.</p>${link('support.html?topic=Payment','Ask about a payout')}</section>`;
  }
  function filteredPayments() {
    const q=document.getElementById('search').value.toLowerCase();const status=document.getElementById('filter').value;
    return payments().filter(p=>(p.id+' '+p.project).toLowerCase().includes(q)&&(status==='All statuses'||p.status===status));
  }
  function paymentResults() {
    const list=filteredPayments();
    document.getElementById('results').innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Reference</th><th>Project</th><th>Amount</th><th>Status</th><th>Paid / expected date</th><th>Action</th></tr></thead><tbody>${list.map(p=>`<tr><td>${p.id}</td><td>${p.project}</td><td>${money(p.amount)}</td><td>${badge(p.status)}</td><td>${p.date}</td><td><button class="action" data-payment="${p.id}">View details</button></td></tr>`).join('')}</tbody></table></div>`:empty('No matching payouts',demo?'Try another search or choose All statuses.':'Payout records are not connected yet.');
    document.getElementById('export').disabled=!list.length;
  }
  function installerPage() {
    return `<section class="panel"><h2>Installation tracker</h2><p>Open a project to see its capacity, team, target date, and next step.</p><div class="tools"><label>Search project, system, or team<input id="search" type="search" placeholder="Search installations"></label><label>Installation stage<select id="filter"><option>All stages</option><option>Site survey</option><option>Installation</option><option>Completed</option></select></label></div><div id="results"></div></section><section class="panel"><h2>How installation progresses</h2><p>Site survey → Design approval → Scheduling → Installation → Testing and handover.</p><p>Target dates are planning estimates. Confirm changes with the assigned team through your established contact channel.</p>${link('support.html?topic=Installation','Prepare an installation request')}</section>`;
  }
  function installerResults() {
    const q=document.getElementById('search').value.toLowerCase(), stage=document.getElementById('filter').value;
    const list=rows().filter(p=>(p.name+' '+p.id+' '+p.system+' '+p.team).toLowerCase().includes(q)&&(stage==='All stages'||p.stage===stage));
    document.getElementById('results').innerHTML=list.length?projectTable(list):empty('No matching projects',demo?'Try another search or choose All stages.':'Installation records are not connected yet.');
  }
  function supportPage() {
    return `<div class="columns"><section class="panel"><h2>Prepare a support request</h2><p>Save a draft on this browser or download it to share through your existing support channel. Nothing is sent from this page.</p><form id="request-form"><label>Topic<select name="topic"><option>General</option><option>Payment</option><option>Installation</option><option>Account</option></select></label><label>Project or payout reference (optional)<input name="reference" maxlength="80" placeholder="Enter the relevant reference"></label><label>Subject<input name="subject" required maxlength="120" placeholder="What do you need help with?"></label><label>Details<textarea name="details" required maxlength="3000" placeholder="Describe the issue, when it started, and what you have already checked."></textarea></label><p>Do not include passwords or full bank account numbers.</p><div class="tools"><button class="action primary" type="submit">Save draft on this device</button><button class="action" type="button" id="download-draft">Download request</button></div></form><p id="draft-status" role="status"></p></section><section class="panel"><h2>Quick answers</h2><details><summary>Why is my payout pending?</summary><p>The record may be awaiting review or supporting documents. Open Payments, find the reference, and view its details before preparing a request.</p>${link('payments.html','View payout records')}</details><details><summary>Where can I find the assigned installer?</summary><p>Open Installers and select View project. An unassigned team means no assignment is recorded yet.</p>${link('installers.html','Find a project')}</details><details><summary>How do I update my business details?</summary><p>Select your profile in the top-right corner to open Profile & Settings. In this prototype, changes are stored on this browser.</p><button class="action" id="edit-profile">Open profile settings</button></details><details><summary>Has my request been submitted?</summary><p>No. Saving or downloading a draft does not send it to Hello Solar. Share the downloaded request through your established support channel.</p></details></section></div>`;
  }
  function download(name,text,type) {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function details(title,fields,href,label) {
    const modal=document.createElement('dialog');modal.className='portal-dialog';modal.setAttribute('aria-label',title);
    modal.innerHTML=`<div class="portal"><h2>${esc(title)}</h2><p>Sample record · For preview only</p><dl>${fields.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="tools">${link(href,label)}<button class="action" id="close-detail">Close</button></div></div>`;
    document.body.append(modal);modal.querySelector('#close-detail').onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());modal.showModal();
  }
  function showProject(id) {const p=rows().find(p=>p.id===id);if(p)details(p.name,[['Reference',p.id],['System',p.system],['Location',p.location],['Team',p.team],['Stage',p.stage],['Progress',p.progress+'%'],['Target / completed',p.date],['Next step',p.next]],'support.html?topic=Installation&reference='+p.id,'Prepare request');}
  host.addEventListener('click',e=>{const p=e.target.closest('[data-project]');if(p)showProject(p.dataset.project);const b=e.target.closest('[data-payment]');if(b){const v=payments().find(p=>p.id===b.dataset.payment);if(v)details(v.id,[['Project',v.project],['Amount',money(v.amount)],['Status',v.status],['Date',v.date],['Explanation',v.note]],'support.html?topic=Payment&reference='+v.id,'Ask about this payout');}});
  function render() {
    shell();document.getElementById('workspace').innerHTML=({dashboard,payments:paymentPage,installers:installerPage,support:supportPage}[page]||dashboard)();
    if(page==='payments'||page==='installers'){const update=page==='payments'?paymentResults:installerResults;document.getElementById('search').oninput=update;document.getElementById('filter').onchange=update;update();}
    if(page==='payments')document.getElementById('export').onclick=()=>download('sample-payouts.csv','Sample data - not a payment confirmation\r\nReference,Project,Amount PHP,Status,Date\r\n'+filteredPayments().map(p=>[p.id,p.project,p.amount,p.status,p.date].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv');
    if(page==='support') {
      const form=document.getElementById('request-form');let draft={};try{draft=JSON.parse(read(key+':draft')||'{}');}catch{}
      for(const name of ['topic','reference','subject','details'])if(typeof draft[name]==='string')form.elements[name].value=draft[name];
      const params=new URLSearchParams(location.search);
      // Preserve saved drafts; apply incoming context only when the form has no draft.
      if(!draft.subject&&!draft.details){if(['Payment','Installation','Account','General'].includes(params.get('topic')))form.elements.topic.value=params.get('topic');form.elements.reference.value=params.get('reference')||'';}
      const getDraft=()=>Object.fromEntries(new FormData(form));
      form.onsubmit=e=>{e.preventDefault();const ok=write(key+':draft',JSON.stringify(getDraft()));document.getElementById('draft-status').textContent=ok?'Draft saved on this device. It has not been sent.':'Could not save on this browser. Download the request instead.';};
      document.getElementById('download-draft').onclick=()=>{if(form.reportValidity())download('hello-solar-support-draft.txt','UNSENT SUPPORT REQUEST\n\n'+Object.entries(getDraft()).map(([k,v])=>k.toUpperCase()+': '+v).join('\n\n'),'text/plain');};
      document.getElementById('edit-profile').onclick=()=>window.HelloSolarMerchant.openProfileSettings();
      // Do not discard unsaved text when changing sample mode.
      document.getElementById('demo-toggle').onclick=()=>{demo=!demo;write(key+':demo',String(demo));document.getElementById('demo-toggle').textContent=demo?'Hide sample data':'Explore sample data';host.querySelector('.notice').textContent=demo?'Sample data enabled on the merchant pages. This support request remains an unsent draft.':'No live merchant records are connected yet. This support request remains an unsent draft.';};
    }
  }
  render();
  if(page==='installers')showProject(new URLSearchParams(location.search).get('project'));
})();
