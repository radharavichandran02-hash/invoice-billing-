const STORAGE_KEYS = {
  clients: 'if_clients_v1',
  invoices: 'if_invoices_v1',
  settings: 'if_settings_v1'
};

const GST_RATE = 0.18; // 18% GST (9% CGST + 9% SGST)


if(!localStorage.getItem(STORAGE_KEYS.clients)){
  const sampleClients = [
    {id:1,name:"Acme Corp",email:"billing@acme.com",phone:"555-1234"},
    {id:2,name:"Beta LLC",email:"hello@beta.co",phone:"555-5678"},
    {id:3,name:"Gamma Systems",email:"contact@gamma.net",phone:"555-9012"}
  ];
  localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(sampleClients));
}
if(!localStorage.getItem(STORAGE_KEYS.invoices)){

  const sampleInvoices = [
    {id:1001, clientId:1, amount:4500.00, subTotal:3813.56, gstAmount:686.44, created:"2025-10-01", due:"2025-10-15", status:"paid", items: [{description:"Website redesign and development",qty:1,price:3813.56}]}, 
    {id:1002, clientId:2, amount:1200.00, subTotal:1016.95, gstAmount:183.05, created:"2025-10-05", due:"2025-10-20", status:"due", items:[{description:"Yearly cloud hosting and maintenance package",qty:12,price:84.75}]},
    {id:1003, clientId:3, amount:850.50, subTotal:720.76, gstAmount:129.74, created:"2025-10-20", due:"2025-11-05", status:"due", items:[{description:"Monthly SEO consultation",qty:1,price:720.76}]}
  ];
  localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(sampleInvoices));
}
if(!localStorage.getItem(STORAGE_KEYS.settings)){
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({bizName:"InvoiceFlow Dynamics", currency:"USD", paymentLinkBase:"https://pay.example.com/invoice/"}));
}
const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
function readClients(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.clients) || '[]') }
function readInvoices(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.invoices) || '[]') }
function writeClients(d){ localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(d)) }
function writeInvoices(d){ localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(d)) }
function readSettings(){ return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{}') }
function writeSettings(s){ localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s)) }
function currencyFormat(n){
  const cur = readSettings().currency || 'USD';
  try{ return new Intl.NumberFormat('en-US',{style:'currency',currency:cur}).format(n) }catch(e){ return (cur!=='USD'?cur+' ':'$')+(n||0).toFixed(2) }
}
function nextId(list, start=1000){ return list.length ? Math.max(...list.map(i=>i.id))+1 : start }
function renderDashboard(){
  const invoices = readInvoices();
  const total = invoices.reduce((s,i)=>s+(i.amount||0),0);
  const outstanding = invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+(i.amount||0),0);
  const paid = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+(i.amount||0),0);
  $('#totalRevenue').textContent = currencyFormat(total);
  $('#outstanding').textContent = currencyFormat(outstanding);
  $('#paidMonth').textContent = currencyFormat(paid);
  const tbody = $('#recentTable tbody'); tbody.innerHTML = '';
  const clients = readClients();
  invoices.slice(0,8).sort((a,b)=>b.id-a.id).forEach(inv=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${inv.id}</td>
      <td>${(clients.find(c=>c.id===inv.clientId)||{name:'Unknown'}).name}</td>
      <td>${currencyFormat(inv.amount)}</td>
      <td>${inv.due}</td>
      <td><span class="status ${inv.status==='paid'?'paid':'due'}">${inv.status.toUpperCase()}</span></td>`;
    tbody.appendChild(tr);
  });
}
function renderInvoiceFilters(){
  const clients = readClients();
  const filterClient = $('#filterClient');
  const currentValue = filterClient.value;
  filterClient.innerHTML = '<option value="">All Clients</option>';
  clients.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    filterClient.appendChild(opt);
  });
  filterClient.value = currentValue;
}
function renderInvoices(filterText='', filterStatus='', filterClientId=''){
  const invoices = readInvoices().slice().sort((a,b)=>b.id-a.id);
  const clients = readClients();
  let list = invoices;
  if(filterStatus) list = list.filter(i=>i.status===filterStatus);
  if(filterClientId) list = list.filter(i=>i.clientId===parseInt(filterClientId));
  if(filterText){
    const t = filterText.toLowerCase();
    list = list.filter(i=> {
      const clientName = (clients.find(c=>c.id===i.clientId)||{name:''}).name.toLowerCase();
      return String(i.id).includes(t) || clientName.includes(t) || String(i.amount).includes(t);
    });
  }
  const tbody = $('#invoicesTable tbody'); tbody.innerHTML = '';
  list.forEach(i=>{
    const client = (clients.find(c=>c.id===i.clientId)||{name:'Unknown',email:''});
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i.id}</td>
      <td>${client.name}</td>
      <td>${i.created}</td>
      <td>${currencyFormat(i.amount)}</td>
      <td>${i.due}</td>
      <td><span class="status ${i.status==='paid'?'paid':'due'}">${i.status}</span></td>
      <td class="actions">
        <button onclick="viewInvoice(${i.id})">View</button>
        <button onclick="downloadInvoicePDF(${i.id})">PDF</button>
        ${i.status!=='paid'?`<button onclick="sendEmail(${i.id},'${escapeHtml(client.email)}')">Send Email</button>`:""}
        ${i.status!=='paid'?`<button class="payment-link" onclick="copyPaymentLink(${i.id})">Payment Link</button>`:""}
        ${i.status!=='paid'?`<button onclick="markPaid(${i.id})">Mark Paid</button>`:""}
        <button onclick="deleteInvoice(${i.id})" style="color:var(--danger)">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#countInvoices').textContent = list.length;
}
function renderClients(){
  const clients = readClients();
  const root = $('#clientsList'); root.innerHTML = '';
  if(clients.length===0){ root.innerHTML = '<div class="muted">No clients yet. Click "Add New Client" to begin.</div>'; return; }
  clients.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'client-item card';
    el.style.cssText = 'padding:12px; margin-bottom:10px; border-bottom: none; display:flex; justify-content:space-between; align-items:center;';
    el.innerHTML = `<div><div style="font-weight:800">${escapeHtml(c.name)}</div>
      <div class="muted">${escapeHtml(c.email||'No email')} ${c.phone ? '• '+c.phone : ''}</div></div>
      <div style="display:flex;gap:8px">
        <button onclick="openClientModal(${c.id})" class="btn ghost">Details/Edit</button>
        <button onclick="removeClient(${c.id})" class="btn ghost">Remove</button>
      </div>`;
    root.appendChild(el);
  });
}
function viewInvoice(id){
  const inv = readInvoices().find(i=>i.id===id);
  if(!inv) return showToast('Invoice not found');
  const client = readClients().find(c=>c.id===inv.clientId) || {};
  const settings = readSettings();
  
  
  const subTotal = inv.subTotal || (inv.amount / (1 + GST_RATE)).toFixed(2);
  const gstAmount = inv.gstAmount || (inv.amount - subTotal).toFixed(2);
  
  const itemsHtml = (inv.items||[]).map(it=>`<tr><td>${escapeHtml(it.description)}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${currencyFormat(it.price)}</td><td style="text-align:right">${currencyFormat(it.qty*it.price)}</td></tr>`).join('');
  const html = `
    <div style="padding:15px">
      <h3 style="margin-top:0">Invoice #${inv.id}</h3>
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding-bottom:15px;margin-bottom:15px">
        <div>
          <div style="font-weight:800">${escapeHtml(client.name||'Unknown Client')}</div>
          <div class="muted">${escapeHtml(client.email||'No email provided')}</div>
          <div class="muted">${escapeHtml(client.phone||'No phone provided')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800">${settings.bizName}</div>
          <div class="muted">Created: ${inv.created}</div>
          <div class="muted">Due: ${inv.due}</div>
          <div style="margin-top:5px"><span class="status ${inv.status==='paid'?'paid':'due'}">${inv.status.toUpperCase()}</span></div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border)"><th>Description</th><th style="width:80px;text-align:center">Qty</th><th style="width:120px;text-align:right">Price (Before GST)</th><th style="width:120px;text-align:right">Total (Before GST)</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      
      <div style="text-align:right;margin-top:20px;padding-top:10px;border-top:1px solid var(--border)">
        <div style="font-weight:600;font-size:16px;">Sub Total: ${currencyFormat(subTotal)}</div>
        <div style="font-weight:600;font-size:16px;">GST (18%): ${currencyFormat(gstAmount)}</div>
      </div>
      <div style="text-align:right;margin-top:10px;font-weight:800;font-size:20px;padding-top:10px;border-top:2px solid var(--border)">
        GRAND TOTAL: ${currencyFormat(inv.amount)}
      </div>
      
      <div style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">
        ${inv.status!=='paid'?`<button onclick="markPaid(${inv.id}); closeModal()" class="btn primary">Mark Paid</button>`:''}
        <button onclick="downloadInvoicePDF(${inv.id}); closeModal()" class="btn ghost">Download PDF</button>
        <button onclick="sendEmail(${inv.id},'${escapeHtml(client.email)}'); closeModal()" class="btn ghost">Send Email</button>
        <button onclick="copyPaymentLink(${inv.id}); closeModal()" class="btn ghost">Copy Payment Link</button>
        <button onclick="closeModal()" class="btn ghost">Close</button>
      </div>
    </div>`;
  openModal(html, {closable:true});
}
function deleteInvoice(id){
  if(!confirm('Are you sure you want to delete invoice '+id+'? This action cannot be undone.')) return;
  const invoices = readInvoices().filter(i=>i.id!==id);
  writeInvoices(invoices); refreshAll();
  showToast('Invoice deleted successfully');
}
function markPaid(id){
  const invoices = readInvoices();
  const inv = invoices.find(i=>i.id===id);
  if(!inv) return;
  inv.status = 'paid';
  writeInvoices(invoices);
  refreshAll();
  showToast('Invoice '+id+' marked as PAID');
}
function sendEmail(id, clientEmail){
  if (!clientEmail || clientEmail.indexOf('@') === -1) {
      return showToast('Client email missing or invalid. Cannot send email.');
  }
  const settings = readSettings();
  const inv = readInvoices().find(i=>i.id===id);
  const paymentLink = settings.paymentLinkBase + id;
  const subject = `Invoice #${id} from ${settings.bizName} - ${currencyFormat(inv.amount)} Due ${inv.due}`;
  const body = `Dear Client,\n\nPlease find attached Invoice #${id} for the amount of ${currencyFormat(inv.amount)}, due on ${inv.due}.\n\nIf you wish to pay online, please use this link: ${paymentLink}\n\nThank you for your prompt payment.\n\nBest regards,\n${settings.bizName}`;
  const mailtoLink = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoLink;
  showToast(`Email draft opened for Invoice #${id}`);
}
function copyPaymentLink(id){
  const settings = readSettings();
  const paymentLink = settings.paymentLinkBase + id;
  navigator.clipboard.writeText(paymentLink).then(()=>{
      showToast('Payment link copied: ' + paymentLink, 2500);
  }).catch(err=>{
      console.error('Copy failed:', err);
      showToast('Failed to copy link. See console for error.', 3000);
  });
}
function openClientModal(id){
  const clients = readClients();
  const c = id ? clients.find(x=>x.id===id) : {id:0, name:'', email:'', phone:''};
  const html = `
    <h3>${id ? 'Edit Client' : 'Add New Client'}</h3>
    <div style="display:flex;gap:12px;flex-direction:column">
      <label style="font-weight:600">Client Name</label>
      <input id="mc_name" value="${escapeHtml(c.name)}" placeholder="e.g., Acme Corp" />
      <label style="font-weight:600">Email Address</label>
      <input id="mc_email" type="email" value="${escapeHtml(c.email)}" placeholder="e.g., billing@acme.com" />
      <label style="font-weight:600">Phone Number (Optional)</label>
      <input id="mc_phone" value="${escapeHtml(c.phone)}" placeholder="e.g., 555-123-4567" />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button onclick="closeModal()" class="btn ghost">Cancel</button>
        <button onclick="saveClient(${c.id})" class="btn primary">${id ? 'Update Client' : 'Add Client'}</button>
      </div>
    </div>
  `;
  openModal(html);
}
function saveClient(id){
  const name = $('#mc_name').value.trim();
  const email = $('#mc_email').value.trim();
  const phone = $('#mc_phone').value.trim();
  if(!name) return showToast('Client name is required');
  let clients = readClients();
  if(id){
    const c = clients.find(x=>x.id===id);
    if(c){ c.name = name; c.email = email; c.phone = phone; }
    showToast('Client updated');
  } else {
    clients.push({id: nextId(clients,1), name, email, phone});
    showToast('Client added');
  }
  writeClients(clients);
  closeModal();
  refreshAll();
}
function removeClient(id){
  if(!confirm('Remove client and associated invoices? This action cannot be undone.')) return;
  let clients = readClients();
  let invoices = readInvoices();
  clients = clients.filter(c=>c.id!==id);
  invoices = invoices.filter(i=>i.clientId!==id);
  writeClients(clients); 
  writeInvoices(invoices);
  refreshAll();
  showToast('Client and associated invoices removed');
}
function openModal(innerHtml, opts={}){
  const root = document.getElementById('modalRoot');
  root.style.display='block';
  root.innerHTML = `<div class="modal-back" onclick="${opts.closable!==false ? 'closeModal(event)' : ''}"><div class="modal" onclick="event.stopPropagation()">${innerHtml}</div></div>`;
}
function closeModal(e){
  if(e && e.target.classList.contains('modal-back')){
  }
  const root = document.getElementById('modalRoot');
  root.style.display='none';
  root.innerHTML='';
}
function openNewInvoice(prefClientId){
  const clients = readClients();
  if(clients.length === 0){
      showToast("Please add a client first!");
      setActive('clients');
      return;
  }
  const options = clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  const html = `
    <h3>Create New Invoice</h3>
    <div class="row" style="margin-top:10px">
      <div class="col"><label style="font-weight:600">Client</label><select id="mi_client">${options}</select></div>
      <div class="col"><label style="font-weight:600">Due Date</label><input type="date" id="mi_due" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div style="margin-top:15px; font-weight:600">Invoice Items (Price is before GST)</div>
    <div id="itemsRoot" style="margin-top:8px; border:1px solid var(--border); padding:10px; border-radius:10px;"></div>
    <div style="display:flex;gap:10px;margin-top:12px;align-items:center">
      <button onclick="addItemRow()" class="btn ghost">+ Add new item</button>
      <div style="flex:1"></div>
      <div style="text-align:right">
        <div class="muted">Sub Total</div>
        <div id="modalSubTotal" style="font-weight:900; font-size:18px;">${currencyFormat(0)}</div>
        <div class="muted" style="margin-top:5px">GST (18%)</div>
        <div id="modalGST" style="font-weight:900; font-size:18px;">${currencyFormat(0)}</div>
        <div class="muted" style="margin-top:5px">Grand Total</div>
        <div id="modalTotal" style="font-weight:900; font-size:24px; color:var(--accent-2)">${currencyFormat(0)}</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">
      <button onclick="closeModal()" class="btn ghost">Cancel</button>
      <button onclick="saveInvoice()" class="btn primary">Save & Generate</button>
    </div>
  `;
  openModal(html);
  if(prefClientId) document.getElementById('mi_client').value = prefClientId;
  addItemRow(); 
  recalcModalTotal();
}
function addItemRow(){
  const itemsRoot = document.getElementById('itemsRoot');
  const div = document.createElement('div');
  div.className = 'item-row';
  div.innerHTML = `<input data-desc placeholder="Description of service or product" />
    <input data-qty type="number" value="1" style="width:80px; text-align:center" />
    <input data-price type="number" value="0.00" step="0.01" style="width:120px; text-align:right" />
    <button class="btn ghost" style="width:70px" onclick="this.parentElement.remove(); recalcModalTotal()">X</button>`;
  itemsRoot.appendChild(div);
  div.querySelectorAll('[data-qty],[data-price]').forEach(el=>el.addEventListener('input',recalcModalTotal));
  div.querySelector('[data-desc]').focus();
}
function recalcModalTotal(){
  const itemsRoot = document.getElementById('itemsRoot');
  let subTotal = 0;
  if(!itemsRoot) return;
  itemsRoot.querySelectorAll('.item-row').forEach(row=>{
    const q = parseFloat(row.querySelector('[data-qty]').value||0);
    const p = parseFloat(row.querySelector('[data-price]').value||0);
    subTotal += q*p;
  });
  const gstAmount = subTotal * GST_RATE;
  const grandTotal = subTotal + gstAmount;
  document.getElementById('modalSubTotal').textContent = currencyFormat(subTotal);
  document.getElementById('modalGST').textContent = currencyFormat(gstAmount);
  document.getElementById('modalTotal').textContent = currencyFormat(grandTotal);
}
function saveInvoice(){
  const sel = document.getElementById('mi_client');
  const clientName = sel ? sel.options[sel.selectedIndex].text : 'Unknown';
  if(!sel || !sel.value){ showToast('No client selected'); return; }
  const clientId = parseInt(sel.value);
  const due = document.getElementById('mi_due').value;
  const itemsRoot = document.getElementById('itemsRoot');
  const rawItems = Array.from(itemsRoot.querySelectorAll('.item-row')).map(row=>({
    description: row.querySelector('[data-desc]').value || 'Item',
    qty: +row.querySelector('[data-qty]').value || 0,
    price: +row.querySelector('[data-price]').value || 0 // Price is before GST
  })).filter(i => i.qty > 0 && i.price > 0);
  if(rawItems.length === 0){ showToast('Please add at least one item with a quantity and price.'); return; }
  
  const subTotal = rawItems.reduce((s,i)=>s + (i.qty||0)*(i.price||0), 0);
  const gstAmount = subTotal * GST_RATE;
  const grandTotal = subTotal + gstAmount;

  const invoices = readInvoices();
  const nid = nextId(invoices, 1001);
  invoices.unshift({
    id:nid,
    clientId,
    amount:+grandTotal.toFixed(2), // Grand Total
    subTotal:+subTotal.toFixed(2), // Sub Total
    gstAmount:+gstAmount.toFixed(2), // GST Amount
    created:(new Date()).toISOString().slice(0,10),
    due,
    status:'due',
    items: rawItems
  });
  writeInvoices(invoices);
  closeModal();
  refreshAll();
  showToast(`New Invoice #${nid} created for ${clientName}`);
}
async function generatePdfBlob(invoice){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pad = 40;
  let y = 40;
  const settings = readSettings();
  const biz = settings.bizName || 'InvoiceFlow';
  doc.setFontSize(22); doc.setFont('helvetica','bold'); 
  doc.setTextColor(4, 120, 87);
  doc.text(biz, 560, y, {align:'right'});
  doc.setTextColor(31, 41, 55); y+=30;
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.text(`INVOICE #${invoice.id}`, pad, y); y+=20;
  doc.setFontSize(11); doc.setFont('helvetica','normal');
  const client = (readClients().find(c=>c.id===invoice.clientId)||{name:'Unknown',email:''});
  doc.text(`Date: ${invoice.created}`, 560, y, {align:'right'}); y+=16;
  doc.text(`Due Date: ${invoice.due}`, 560, y, {align:'right'}); y+=20;
  doc.setFont('helvetica','bold'); doc.text('Bill To:', pad, y); y+=14;
  doc.setFont('helvetica','normal'); doc.text(client.name, pad, y); y+=14;
  if(client.email) { doc.text(client.email, pad, y); y+=14; }
  if(client.phone) { doc.text(client.phone, pad, y); y+=14; }
  y+=10;
  doc.setFillColor(236, 253, 245);
  doc.rect(pad, y, 520, 20, 'F');
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('Description', pad + 5, y+13); doc.text('Qty', 360, y+13); doc.text('Price (Pre-GST)', 420, y+13, {align:'right'}); doc.text('Total (Pre-GST)', 520, y+13, {align:'right'});
  y+=28;
  doc.setFont('helvetica','normal');
  invoice.items.forEach(it=>{
    const lineTotal = (it.qty||0)*(it.price||0);
    const descLines = doc.splitTextToSize(it.description || '-', 300);
    doc.text(descLines, pad, y);
    doc.text(String(it.qty), 360, y);
    doc.text(currencyFormat(it.price), 420, y, {align:'right'});
    doc.text(currencyFormat(lineTotal), 520, y, {align:'right'});
    y += (descLines.length * 14) + 8;
    if(y > 720){ doc.addPage(); y = 40; }
  });
  y += 10;
  
  
  const subTotal = invoice.subTotal || (invoice.amount / (1 + GST_RATE)).toFixed(2);
  const gstAmount = invoice.gstAmount || (invoice.amount - subTotal).toFixed(2);

  
  doc.setLineWidth(1); doc.line(400, y, 560, y); y+=14;
  doc.setFontSize(11);
  doc.text('Sub Total:', 400, y, {align:'right'});
  doc.text(currencyFormat(subTotal), 520, y, {align:'right'}); y+=14;

  
  doc.text('GST (18%):', 400, y, {align:'right'});
  doc.text(currencyFormat(gstAmount), 520, y, {align:'right'}); y+=14;
  
  
  doc.setLineWidth(1); doc.line(400, y, 560, y); y+=8; 
  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('Grand Total:', 400, y, {align:'right'});
  doc.text(currencyFormat(invoice.amount), 520, y, {align:'right'});
  
  const pdfBlob = doc.output('blob');
  return pdfBlob;
}
async function downloadInvoicePDF(id){
  const inv = readInvoices().find(i=>i.id===id);
  if(!inv) return showToast('Invoice not found');
  showToast('Generating PDF...');
  const envelope = $('#envelope');
  envelope.classList.remove('done'); envelope.classList.add('show');
  try{
    const blob = await generatePdfBlob(inv);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `invoice-${inv.id}.pdf`;
    document.body.appendChild(a); a.click();
    a.remove(); URL.revokeObjectURL(url);
    envelope.classList.remove('show'); envelope.classList.add('done');
    showToast('PDF downloaded successfully');
    setTimeout(()=>envelope.classList.remove('done'), 1200);
  }catch(err){
    console.error(err);
    envelope.classList.remove('show');
    showToast('Error generating PDF');
  }
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function showToast(text, duration=1800){
  const t = $('#toast'); t.innerText = text; t.style.display='block';
  setTimeout(()=>{ t.style.display='none'; }, duration);
}
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function setActive(page){
  $$('.menu button').forEach(b=>b.classList.remove('active'));
  $(`.menu button[data-page="${page}"]`)?.classList.add('active');
  $('#pageTitle').textContent = page.charAt(0).toUpperCase()+page.slice(1);
  $('#pageSub').textContent = page==='dashboard'? 'Overview of your invoicing activity' : page==='invoices'? 'Manage and filter all your invoices' : page==='clients' ? 'Manage business clients' : 'Update company details and currency';
  $('#dashboardPage').style.display = page==='dashboard' ? '' : 'none';
  $('#invoicesPage').style.display = page==='invoices' ? '' : 'none';
  $('#clientsPage').style.display = page==='clients' ? '' : 'none';
  $('#settingsPage').style.display = page==='settings' ? '' : 'none';
  if(page==='invoices') refreshInvoicesWithFilters();
  if(page==='clients') renderClients();
  if(page==='settings') loadSettings();
}
function renderAll(){ renderDashboard(); renderInvoiceFilters(); renderInvoices(); renderClients(); loadSettings(); }
function refreshInvoicesWithFilters(){
  renderInvoices($('#searchInput').value || '', $('#filterStatus').value || '', $('#filterClient').value || '');
}
function refreshAll(){
  renderDashboard(); 
  renderInvoiceFilters();
  refreshInvoicesWithFilters(); 
  renderClients();
}
function loadSettings(){
  const s = readSettings();
  $('#bizName').value = s.bizName || '';
  $('#currency').value = s.currency || 'USD';
  $('#paymentLinkBase').value = s.paymentLinkBase || 'https://pay.example.com/invoice/';
  $('.brand-text').textContent = s.bizName || 'InvoiceFlow';
}
function saveSettings(){
  const s = { 
    bizName: $('#bizName').value.trim() || 'InvoiceFlow', 
    currency: $('#currency').value.trim().toUpperCase() || 'USD',
    paymentLinkBase: $('#paymentLinkBase').value.trim() || 'https://pay.example.com/invoice/'
  };
  writeSettings(s);
  showToast('Settings saved successfully!');
  renderAll();
}
document.getElementById('openNew').addEventListener('click',()=>openNewInvoice());
document.getElementById('newFromInv').addEventListener('click',()=>openNewInvoice());
document.getElementById('addClient').addEventListener('click',()=>openClientModal(0));
const filterHandler = ()=> refreshInvoicesWithFilters();
document.getElementById('searchInput').addEventListener('input', filterHandler);
document.getElementById('filterStatus').addEventListener('change', filterHandler);
document.getElementById('filterClient').addEventListener('change', filterHandler);
document.getElementById('saveSettings').addEventListener('click',saveSettings);
$$('.menu button').forEach(btn=>btn.addEventListener('click',()=>setActive(btn.dataset.page)));
renderAll();
window.viewInvoice = viewInvoice;
window.markPaid = markPaid;
window.deleteInvoice = deleteInvoice;
window.downloadInvoicePDF = downloadInvoicePDF;
window.sendEmail = sendEmail;
window.copyPaymentLink = copyPaymentLink;
window.openClientModal = openClientModal;
window.saveClient = saveClient;
window.removeClient = removeClient;
window.closeModal = closeModal;
window.addItemRow = addItemRow;
window.recalcModalTotal = recalcModalTotal;
window.saveInvoice = saveInvoice;
window.openNewInvoice = openNewInvoice;
