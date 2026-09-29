/* ========== Armazenamento ==========
   Única camada que toca no localStorage. Para usar uma API no futuro,
   troque apenas load/save/clear (mantendo a mesma forma dos dados). */
const Storage = {
  KEY: 'poeta:data',
  THEME: 'poeta:theme',
  empty: () => ({ notes: [], ideas: [], tasks: [], plans: [] }),
  load() {
    try { return { ...this.empty(), ...JSON.parse(localStorage.getItem(this.KEY)) }; }
    catch { return this.empty(); }
  },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); },
  clear() { localStorage.removeItem(this.KEY); },
  getTheme: () => localStorage.getItem('poeta:theme') || 'light',
  setTheme: (t) => localStorage.setItem('poeta:theme', t),
};

/* ========== Estado e dados ========== */
let data = Storage.load();
const ui = {
  notes: { q: '', cat: '', sort: 'desc' },
  ideas: { status: '' },
  tasks: { status: '', prio: '', sort: 'due' },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const nowISO = () => new Date().toISOString();
const todayStr = () => new Date().toLocaleDateString('sv-SE');

const Repo = {
  add(c, item) {
    data[c].unshift({ id: uid(), createdAt: nowISO(), updatedAt: nowISO(), ...item });
    commit();
  },
  edit(c, id, patch) {
    const i = data[c].find(x => x.id === id);
    if (i) Object.assign(i, patch, { updatedAt: nowISO() });
    commit();
  },
  remove(c, id) { data[c] = data[c].filter(x => x.id !== id); commit(); },
  get: (c, id) => data[c].find(x => x.id === id),
};

function commit() { Storage.save(data); render(); }

/* ========== Utilidades ========== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d) => d ? new Date(d.length === 10 ? d + 'T00:00' : d).toLocaleDateString('pt-BR') : '';
const pct = (p) => p.steps.length ? Math.round(p.steps.filter(s => s.done).length / p.steps.length * 100) : (p.status === 'Concluído' ? 100 : 0);
const dayOf = (iso) => new Date(iso).toLocaleDateString('sv-SE');
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const icons = () => window.lucide && lucide.createIcons();

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ========== Definição dos formulários ========== */
const PRIO = ['Baixa', 'Média', 'Alta'];
const TASK_STATUS = ['Pendente', 'Em andamento', 'Concluída'];
const IDEA_STATUS = ['Ideia', 'Em análise', 'Em execução', 'Concluída', 'Arquivada'];
const PLAN_STATUS = ['Ativo', 'Pausado', 'Concluído'];

const FORMS = {
  notes: { label: 'nota', fields: [
    { n: 'title', l: 'Título', req: 1 }, { n: 'category', l: 'Categoria' },
    { n: 'content', l: 'Conteúdo', t: 'area' }] },
  ideas: { label: 'ideia', fields: [
    { n: 'title', l: 'Título', req: 1 }, { n: 'description', l: 'Descrição', t: 'area' },
    { n: 'category', l: 'Categoria' }, { n: 'status', l: 'Status', t: 'select', o: IDEA_STATUS }] },
  tasks: { label: 'tarefa', fields: [
    { n: 'title', l: 'Título', req: 1 }, { n: 'description', l: 'Descrição (opcional)', t: 'area' },
    { n: 'due', l: 'Prazo', t: 'date' }, { n: 'priority', l: 'Prioridade', t: 'select', o: PRIO },
    { n: 'status', l: 'Status', t: 'select', o: TASK_STATUS }] },
  plans: { label: 'plano', fields: [
    { n: 'name', l: 'Nome', req: 1 }, { n: 'description', l: 'Descrição', t: 'area' },
    { n: 'goal', l: 'Objetivo' }, { n: 'due', l: 'Prazo', t: 'date' },
    { n: 'status', l: 'Status', t: 'select', o: PLAN_STATUS },
    { n: 'steps', l: 'Etapas', t: 'area', hint: 'Uma etapa por linha' }] },
};
const DEFAULTS = {
  notes: { category: '', pinned: false },
  ideas: { status: 'Ideia' },
  tasks: { priority: 'Média', status: 'Pendente' },
  plans: { status: 'Ativo', steps: [] },
};

function fieldHTML(f, v) {
  const val = v[f.n] ?? '';
  const hint = f.hint ? ` <span class="hint">${f.hint}</span>` : '';
  let input;
  if (f.t === 'area') input = `<textarea name="${f.n}">${esc(f.n === 'steps' ? (v.steps || []).map(s => s.text).join('\n') : val)}</textarea>`;
  else if (f.t === 'select') input = `<select name="${f.n}">${f.o.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  else input = `<input name="${f.n}" type="${f.t || 'text'}" value="${esc(val)}" ${f.req ? 'required' : ''}>`;
  return `<label>${f.l}${hint}${input}</label>`;
}

function openForm(coll, id) {
  const def = FORMS[coll];
  const current = id ? Repo.get(coll, id) : { ...DEFAULTS[coll] };
  const f = def.fields;
  const html = f.map(x => fieldHTML(x, current));
  // Agrupa prazo/prioridade/status em linhas para economizar espaço
  const body = html.join('');
  $('#modalForm').innerHTML = `<h2>${id ? 'Editar' : 'Nova'} ${def.label}</h2>${body}
    <div class="foot"><button class="btn" value="cancel" formnovalidate>Cancelar</button>
    <button class="btn primary" type="submit" value="ok">Salvar</button></div>`;
  const modal = $('#modal');
  $('#modalForm').onsubmit = (e) => {
    if (e.submitter?.value !== 'ok') return;
    const fd = Object.fromEntries(new FormData($('#modalForm')));
    if (coll === 'plans') {
      const old = current.steps || [];
      fd.steps = (fd.steps || '').split('\n').map(t => t.trim()).filter(Boolean)
        .map(text => ({ text, done: !!old.find(s => s.text === text && s.done) }));
    }
    if (coll === 'tasks') { fd.priority = fd.priority || 'Média'; fd.completedAt = fd.status === 'Concluída' ? (current.completedAt || nowISO()) : ''; }
    id ? Repo.edit(coll, id, fd) : Repo.add(coll, fd);
    const masc = coll === 'plans';
    toast(`${def.label[0].toUpperCase() + def.label.slice(1)} ${id ? (masc ? 'atualizado' : 'atualizada') : (masc ? 'criado' : 'criada')} com sucesso.`);
  };
  modal.showModal();
  $('#modalForm input')?.focus();
}

/* ========== Componentes ========== */
const empty = (msg) => `<div class="empty">${msg}</div>`;
const iconBtn = (act, c, id, icon, label, cls = '', extra = '') =>
  `<button class="icon-btn ${cls}" data-act="${act}" data-c="${c}" data-id="${id}" ${extra} aria-label="${label}" title="${label}"><i data-lucide="${icon}"></i></button>`;
const rowActions = (c, id) => iconBtn('edit', c, id, 'pencil', 'Editar') + iconBtn('del', c, id, 'trash-2', 'Excluir');

function taskItem(t) {
  const done = t.status === 'Concluída';
  const late = t.due && t.due < todayStr() && !done;
  return `<div class="card item ${done ? 'done' : ''}">
    <button class="check ${done ? 'on' : ''}" data-act="toggleTask" data-id="${t.id}" aria-label="Concluir tarefa"><i data-lucide="check"></i></button>
    <div class="body"><div class="title">${esc(t.title)}</div>
      ${t.description ? `<p>${esc(t.description)}</p>` : ''}
      <div class="meta"><span class="tag ${t.priority === 'Alta' ? 'high' : ''}">${t.priority}</span>
        <span class="tag ${done ? 'ok' : t.status === 'Em andamento' ? 'blue' : ''}">${t.status}</span>
        ${t.due ? `<span class="${late ? 'late' : ''}">${late ? 'Atrasada · ' : ''}${fmtDate(t.due)}</span>` : ''}</div></div>
    <div>${rowActions('tasks', t.id)}</div></div>`;
}

function noteItem(n) {
  return `<div class="card item"><div class="body"><div class="title">${esc(n.title)}</div>
    ${n.content ? `<p>${esc(n.content.slice(0, 220))}${n.content.length > 220 ? '…' : ''}</p>` : ''}
    <div class="meta">${n.category ? `<span class="tag blue">${esc(n.category)}</span>` : ''}<span>Atualizada em ${fmtDate(n.updatedAt)}</span></div></div>
    <div>${iconBtn('pin', 'notes', n.id, 'pin', n.pinned ? 'Desafixar' : 'Fixar', n.pinned ? 'on' : '')}${rowActions('notes', n.id)}</div></div>`;
}

function ideaItem(i) {
  return `<div class="card item ${i.status === 'Arquivada' ? 'done' : ''}"><div class="body"><div class="title">${esc(i.title)}</div>
    ${i.description ? `<p>${esc(i.description)}</p>` : ''}
    <div class="meta"><span class="tag blue">${i.status}</span>${i.category ? `<span class="tag">${esc(i.category)}</span>` : ''}<span>${fmtDate(i.createdAt)}</span></div></div>
    <div>${rowActions('ideas', i.id)}</div></div>`;
}

function planCard(p, full) {
  const v = pct(p), d = p.steps.filter(s => s.done).length;
  return `<div class="card">
    <div class="item"><div class="body"><div class="title">${esc(p.name)}</div>
      <div class="meta"><span class="tag ${p.status === 'Concluído' ? 'ok' : 'blue'}">${p.status}</span>${p.due ? `<span>Prazo: ${fmtDate(p.due)}</span>` : ''}</div>
      ${full && p.goal ? `<p><b>Objetivo:</b> ${esc(p.goal)}</p>` : ''}
      ${full && p.description ? `<p>${esc(p.description)}</p>` : ''}</div>
      ${full ? `<div>${rowActions('plans', p.id)}</div>` : ''}</div>
    <div class="bar" style="margin-top:12px"><i style="width:${v}%"></i></div>
    <div class="pline"><span>${d} de ${p.steps.length} etapas concluídas</span><b>${v}%</b></div>
    ${full ? `<div class="steps">${p.steps.map((s, i) => `<div class="step ${s.done ? 'done' : ''}">
      <button class="check ${s.done ? 'on' : ''}" data-act="toggleStep" data-id="${p.id}" data-i="${i}" aria-label="Marcar etapa"><i data-lucide="check"></i></button><span>${esc(s.text)}</span></div>`).join('')}</div>` : ''}
  </div>`;
}

const quickBtns = `<div class="actions">
  <button class="btn primary" data-act="new" data-c="notes"><i data-lucide="plus"></i>Nova nota</button>
  <button class="btn" data-act="new" data-c="tasks"><i data-lucide="plus"></i>Nova tarefa</button>
  <button class="btn" data-act="new" data-c="ideas"><i data-lucide="plus"></i>Nova ideia</button>
  <button class="btn" data-act="new" data-c="plans"><i data-lucide="plus"></i>Novo plano</button></div>`;

/* ========== Gráficos de desempenho ========== */
const ring = (v, label, sub) => `<div class="card ring"><div class="rw"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="bg"/><circle cx="50" cy="50" r="42" class="fg" stroke-dasharray="${v == null ? 0 : v * 2.639} 263.9"/></svg><b>${v == null ? '–' : v + '%'}</b></div><div><div class="title">${label}</div><p class="sub">${sub}</p></div></div>`;

function weekChart() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const counts = days.map(d => data.tasks.filter(t => t.completedAt && dayOf(t.completedAt) === d.toLocaleDateString('sv-SE')).length);
  const max = Math.max(1, ...counts);
  return `<div class="card"><h2>Concluídas nos últimos 7 dias</h2><div class="wk">${days.map((d, i) =>
    `<div><i class="${counts[i] ? 'has' : ''}" style="height:${counts[i] / max * 100}%" title="${counts[i]}"></i><span>${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span></div>`).join('')}</div></div>`;
}

function perf() {
  const done = data.tasks.filter(t => t.status === 'Concluída');
  const dated = done.filter(t => t.due && t.completedAt);
  const ok = dated.filter(t => dayOf(t.completedAt) <= t.due).length;
  const sla = dated.length ? Math.round(ok / dated.length * 100) : null;
  const rate = data.tasks.length ? Math.round(done.length / data.tasks.length * 100) : null;
  const late = data.tasks.filter(t => t.status !== 'Concluída' && t.due && t.due < todayStr()).length;
  return `<div class="grid perf">${ring(sla, 'SLA de prazos', dated.length ? `${ok} de ${dated.length} entregues no prazo` : 'Conclua tarefas com prazo para medir')}
    ${ring(rate, 'Taxa de conclusão', `${done.length} de ${data.tasks.length} tarefas · ${late} atrasada${late === 1 ? '' : 's'}`)}${weekChart()}</div>`;
}

/* ========== Telas ========== */
const Views = {
  dashboard() {
    const pend = data.tasks.filter(t => t.status !== 'Concluída').length;
    const conc = data.tasks.length - pend;
    const activePlans = data.plans.filter(p => p.status === 'Ativo');
    const todays = data.tasks.filter(t => t.due === todayStr());
    const recent = [...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
    const stat = (n, l) => `<div class="card stat"><b>${n}</b><span>${l}</span></div>`;
    return `<div class="head"><div><h1>${greet()}</h1><div class="sub">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>${quickBtns}</div>
      <div class="grid stats">${stat(pend, 'Tarefas pendentes')}${stat(conc, 'Tarefas concluídas')}${stat(activePlans.length, 'Planos ativos')}${stat(data.ideas.length, 'Ideias registradas')}${stat(data.notes.length, 'Notas')}</div>
      <section><h2>Desempenho</h2>${perf()}</section>
      <div class="grid cols" style="margin-top:28px">
        <section style="margin:0"><h2>Tarefas de hoje</h2><div class="list">${todays.map(taskItem).join('') || empty('Nenhuma tarefa com prazo para hoje.')}</div></section>
        <section style="margin:0"><h2>Planos ativos</h2><div class="list">${activePlans.slice(0, 4).map(p => planCard(p, false)).join('') || empty('Nenhum plano ativo. Crie um para acompanhar um objetivo.')}</div></section>
      </div>
      <section><h2>Notas recentes</h2><div class="list">${recent.map(noteItem).join('') || empty('Nenhuma nota ainda. Comece registrando a primeira.')}</div></section>`;
  },

  notes() {
    const cats = [...new Set(data.notes.map(n => n.category).filter(Boolean))];
    return `<div class="head"><h1>Notas</h1><button class="btn primary" data-act="new" data-c="notes"><i data-lucide="plus"></i>Nova nota</button></div>
      <div class="filters">
        <input type="search" data-f="notes.q" placeholder="Pesquisar notas" value="${esc(ui.notes.q)}">
        <select data-f="notes.cat"><option value="">Todas as categorias</option>${cats.map(c => `<option ${c === ui.notes.cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select data-f="notes.sort"><option value="desc" ${ui.notes.sort === 'desc' ? 'selected' : ''}>Mais recentes</option><option value="asc" ${ui.notes.sort === 'asc' ? 'selected' : ''}>Mais antigas</option></select>
      </div><div class="list" id="list">${Lists.notes()}</div>`;
  },
  ideas() {
    return `<div class="head"><h1>Ideias</h1><button class="btn primary" data-act="new" data-c="ideas"><i data-lucide="plus"></i>Nova ideia</button></div>
      <div class="filters"><select data-f="ideas.status"><option value="">Todos os status</option>${IDEA_STATUS.map(s => `<option ${s === ui.ideas.status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="list" id="list">${Lists.ideas()}</div>`;
  },
  tasks() {
    const o = (arr, cur) => arr.map(s => `<option ${s === cur ? 'selected' : ''}>${s}</option>`).join('');
    return `<div class="head"><h1>Tarefas</h1><button class="btn primary" data-act="new" data-c="tasks"><i data-lucide="plus"></i>Nova tarefa</button></div>
      <div class="filters">
        <select data-f="tasks.status"><option value="">Todos os status</option>${o(TASK_STATUS, ui.tasks.status)}</select>
        <select data-f="tasks.prio"><option value="">Todas as prioridades</option>${o(PRIO, ui.tasks.prio)}</select>
        <select data-f="tasks.sort"><option value="due" ${ui.tasks.sort === 'due' ? 'selected' : ''}>Ordenar por prazo</option><option value="prio" ${ui.tasks.sort === 'prio' ? 'selected' : ''}>Ordenar por prioridade</option></select>
      </div><div class="list" id="list">${Lists.tasks()}</div>`;
  },
  plans() {
    return `<div class="head"><h1>Planos</h1><button class="btn primary" data-act="new" data-c="plans"><i data-lucide="plus"></i>Novo plano</button></div>
      <div class="list">${data.plans.map(p => planCard(p, true)).join('') || empty('Nenhum plano ainda. Defina um objetivo e divida em etapas.')}</div>`;
  },
  progress() {
    const count = (arr, k, v) => arr.filter(x => x[k] === v).length;
    const bar = (label, n, total) => `<div class="r"><span>${label}</span><div class="bar"><i style="width:${total ? n / total * 100 : 0}%"></i></div><b>${n}</b></div>`;
    const T = data.tasks.length, P = data.plans.length;
    return `<div class="head"><h1>Progresso</h1></div>${perf()}
      <div class="grid cols">
        <div class="card"><h2>Tarefas</h2><div class="chart">${TASK_STATUS.map(s => bar(s, count(data.tasks, 'status', s), T)).join('')}</div>
          ${T ? `<div class="pline"><span>${Math.round(count(data.tasks, 'status', 'Concluída') / T * 100)}% concluídas</span></div>` : empty('Sem tarefas ainda.')}</div>
        <div class="card"><h2>Planos</h2><div class="chart">${PLAN_STATUS.map(s => bar(s === 'Ativo' ? 'Em andamento' : s, count(data.plans, 'status', s), P)).join('')}</div>
          ${P ? '' : empty('Sem planos ainda.')}</div>
      </div>
      <div class="grid stats" style="margin-top:12px"><div class="card stat"><b>${data.notes.length}</b><span>Total de notas</span></div><div class="card stat"><b>${data.ideas.length}</b><span>Total de ideias</span></div></div>`;
  },
  settings() {
    return `<div class="head"><h1>Configurações</h1></div>
      <div class="grid" style="max-width:560px">
        <div class="card"><h2>Tema</h2><select id="themeSel"><option value="light" ${Storage.getTheme() === 'light' ? 'selected' : ''}>Claro</option><option value="dark" ${Storage.getTheme() === 'dark' ? 'selected' : ''}>Escuro</option></select></div>
        <div class="card"><h2>Backup</h2><p class="sub" style="margin-bottom:12px">Os dados ficam só neste navegador. Exporte um backup com frequência.</p>
          <div class="actions"><button class="btn" data-act="export"><i data-lucide="download"></i>Exportar dados</button>
          <button class="btn" data-act="import"><i data-lucide="upload"></i>Importar dados</button>
          <input type="file" id="file" accept=".json,application/json" hidden></div></div>
        <div class="card"><h2>Zona de risco</h2><p class="sub" style="margin-bottom:12px">Apaga todas as notas, ideias, tarefas e planos deste navegador.</p>
          <button class="btn danger" data-act="clear"><i data-lucide="trash-2"></i>Limpar dados</button></div>
      </div>`;
  },
};

/* Listas filtráveis: atualizam só o miolo, sem perder o foco da pesquisa */
const Lists = {
  notes() {
    const f = ui.notes, q = f.q.toLowerCase();
    const items = data.notes
      .filter(n => (!q || (n.title + ' ' + n.content).toLowerCase().includes(q)) && (!f.cat || n.category === f.cat))
      .sort((a, b) => (b.pinned - a.pinned) || (f.sort === 'asc' ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt)));
    return items.map(noteItem).join('') || empty(data.notes.length ? 'Nenhuma nota encontrada.' : 'Nenhuma nota ainda. Crie a primeira.');
  },
  ideas() {
    const items = data.ideas.filter(i => !ui.ideas.status || i.status === ui.ideas.status);
    return items.map(ideaItem).join('') || empty(data.ideas.length ? 'Nenhuma ideia com esse status.' : 'Nenhuma ideia ainda. Registre antes que seja esquecida.');
  },
  tasks() {
    const f = ui.tasks;
    const items = data.tasks.filter(t => (!f.status || t.status === f.status) && (!f.prio || t.priority === f.prio))
      .sort((a, b) => f.sort === 'prio' ? PRIO.indexOf(b.priority) - PRIO.indexOf(a.priority) : (a.due || '9999').localeCompare(b.due || '9999'));
    return items.map(taskItem).join('') || empty(data.tasks.length ? 'Nenhuma tarefa com esses filtros.' : 'Nenhuma tarefa ainda. Crie a primeira.');
  },
};

/* ========== Navegação e render ========== */
const NAV = [
  ['dashboard', 'Dashboard', 'layout-dashboard'], ['notes', 'Notas', 'file-text'], ['ideas', 'Ideias', 'lightbulb'],
  ['tasks', 'Tarefas', 'check-square'], ['plans', 'Planos', 'target'], ['progress', 'Progresso', 'bar-chart-3'],
  ['settings', 'Config.', 'settings'],
];
const route = () => { const r = location.hash.slice(1); return Views[r] ? r : 'dashboard'; };

function render() {
  const r = route();
  $('#nav').innerHTML = NAV.map(([id, l, ic]) => `<a href="#${id}" class="${id === r ? 'active' : ''}"><i data-lucide="${ic}"></i><span>${l}</span></a>`).join('');
  $('#app').innerHTML = Views[r]();
  document.title = `Poeta · ${NAV.find(n => n[0] === r)[1]}`;
  applyTheme();
  icons();
}

function applyTheme() {
  const t = Storage.getTheme();
  document.documentElement.dataset.theme = t;
  $('#themeBtn').innerHTML = `<i data-lucide="${t === 'dark' ? 'sun' : 'moon'}"></i><span>${t === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>`;
}

/* ========== Ações ========== */
const Actions = {
  new: (e) => openForm(e.c),
  edit: (e) => openForm(e.c, e.id),
  del(e) {
    const nome = FORMS[e.c].label;
    if (!confirm(`Deseja realmente excluir ${e.c === 'plans' ? 'este' : 'esta'} ${nome}?`)) return;
    Repo.remove(e.c, e.id);
    toast('Excluído com sucesso.');
  },
  toggleTask(e) {
    const t = Repo.get('tasks', e.id);
    const fin = t.status !== 'Concluída';
    Repo.edit('tasks', e.id, { status: fin ? 'Concluída' : 'Pendente', completedAt: fin ? nowISO() : '' });
  },
  toggleStep(e) {
    const p = Repo.get('plans', e.id);
    const steps = p.steps.map((s, i) => i === +e.i ? { ...s, done: !s.done } : s);
    const allDone = steps.length && steps.every(s => s.done);
    Repo.edit('plans', e.id, { steps, status: allDone ? 'Concluído' : (p.status === 'Concluído' ? 'Ativo' : p.status) });
  },
  pin(e) { Repo.edit('notes', e.id, { pinned: !Repo.get('notes', e.id).pinned }); },
  export() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `poeta-backup-${todayStr()}.json` });
    a.click(); URL.revokeObjectURL(a.href);
    toast('Backup exportado.');
  },
  import: () => $('#file').click(),
  clear() {
    if (!confirm('Isso apagará todos os dados do Poeta. Deseja continuar?')) return;
    Storage.clear(); data = Storage.empty(); commit();
    toast('Dados apagados.');
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (el) Actions[el.dataset.act]?.(el.dataset);
});

document.addEventListener('input', (ev) => {
  const key = ev.target.dataset.f;
  if (!key) return;
  const [scope, prop] = key.split('.');
  ui[scope][prop] = ev.target.value;
  $('#list').innerHTML = Lists[scope]();
  icons();
});

document.addEventListener('change', (ev) => {
  if (ev.target.id === 'themeSel') { Storage.setTheme(ev.target.value); applyTheme(); }
  if (ev.target.id === 'file') importFile(ev.target.files[0]);
});

function importFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const keys = Object.keys(Storage.empty());
      if (!keys.every(k => Array.isArray(parsed[k] ?? []))) throw new Error();
      if (!confirm('Importar substituirá os dados atuais. Deseja continuar?')) return;
      data = { ...Storage.empty(), ...Object.fromEntries(keys.map(k => [k, parsed[k] || []])) };
      commit();
      toast('Dados importados com sucesso.');
    } catch { toast('Arquivo inválido. Use um backup .json do Poeta.'); }
  };
  reader.readAsText(file);
}

$('#themeBtn').addEventListener('click', () => {
  Storage.setTheme(Storage.getTheme() === 'dark' ? 'light' : 'dark');
  applyTheme(); icons();
});
window.addEventListener('hashchange', render);
render();
