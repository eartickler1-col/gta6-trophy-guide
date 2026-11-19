// Leonida Trophy Atlas: renders the 55-trophy guide and tracker.
// Progress lives in localStorage under KEY; export/import move it as a file.
// URL params drive the views screenshots use: ?view=roadmap|checklist,
// ?filter=story|missable|collectibles|activities|general|online,
// ?grade=platinum|gold|silver|bronze, ?spoiler=on, ?open=<trophy id>, ?search=<text>.
const KEY = 'leonida-trophy-atlas-v1';

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

const KINDS = [
  ['all', 'All'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['general', 'Other'],
  ['online', 'Online'],
];

const STAGES = [
  { n: 1, title: 'Stage 1 — Play the story', text: 'Chapters 1 to 4 and every story mission. The final mission closes this stage: keep a manual save from before it.' },
  { n: 2, title: 'Stage 2 — Strangers & partners', text: 'The five stranger strands and the two partner trophies. Do the partner trophies here, while your partner is still around.' },
  { n: 3, title: 'Stage 3 — Activities & challenges', text: 'Shooting range, races, drone races, fishing, arcade, bowling, stunts, robberies and the 50 challenges.' },
  { n: 4, title: 'Stage 4 — Collectibles & exploration', text: 'Cards, WAiNK tags, meditation spots, vehicles, areas, garages and the money trophies that ride along.' },
  { n: 5, title: 'Stage 5 — Cleanup & 100%', text: 'The odd one-offs, the choice trophies and the last percentage points toward 100% — then the platinum.' },
];

const params = new URLSearchParams(location.search);
const state = {
  view: params.get('view') === 'roadmap' ? 'roadmap' : 'checklist',
  kind: KINDS.some(([k]) => k === params.get('filter')) ? params.get('filter') : 'all',
  grade: ['platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade')) ? params.get('grade') : 'all',
  spoiler: params.get('spoiler') === 'on',
  earnedOnly: params.get('earned') === 'only',
  search: params.get('search') ?? '',
  openId: Number(params.get('open')) || null,
};

let earned = new Set(loadProgress());

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((name) => trophies.some((t) => t.name === name)) : [];
  } catch {
    return [];
  }
}

function saveProgress() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
}

function isSpoilerHidden(t) {
  return state.spoiler && t.kind === 'story' && !earned.has(t.name);
}

function visibleTrophies() {
  const q = state.search.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind === 'missable' && !t.missable) return false;
    if (state.kind === 'online') return false;
    if (state.kind !== 'all' && state.kind !== 'missable' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.earnedOnly && earned.has(t.name)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide).toLowerCase().includes(q)) return false;
    return true;
  });
}

function gradeLabel(t) {
  return t.grade === 'platinum' ? 'Platinum' : t.grade[0].toUpperCase() + t.grade.slice(1);
}

function renderProgress() {
  const total = trophies.length;
  const done = earned.size;
  document.getElementById('earnedCount').textContent = done;
  document.getElementById('progressFill').style.width = `${Math.round((done / total) * 100)}%`;
  const chips = document.getElementById('gradeChips');
  chips.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const have = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    const all = trophies.filter((t) => t.grade === g).length;
    const span = document.createElement('span');
    span.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = `${have}/${all}`;
    span.append(b, ` ${gradeLabel({ grade: g })}`);
    chips.append(span);
  }
}

function renderChips() {
  const wrap = document.getElementById('kindChips');
  wrap.replaceChildren();
  for (const [kind, label] of KINDS) {
    const count = kind === 'all' ? trophies.length
      : kind === 'missable' ? trophies.filter((t) => t.missable).length
      : kind === 'online' ? 0
      : trophies.filter((t) => t.kind === kind).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (state.kind === kind ? ' is-active' : '');
    btn.textContent = `${label} · ${count}`;
    btn.addEventListener('click', () => { state.kind = kind; renderAll(); });
    wrap.append(btn);
  }
}

function buildGuidePanel(t) {
  const div = document.createElement('div');
  div.className = 'guide';
  if (t.missable) {
    const note = document.createElement('p');
    note.className = 'missable-note';
    note.textContent = `Missable — ${t.missableReason}`;
    div.append(note);
  }
  const p = document.createElement('p');
  p.textContent = t.guide;
  div.append(p);
  const h = document.createElement('h4');
  h.textContent = 'How to do it';
  const ol = document.createElement('ol');
  for (const step of t.steps) {
    const li = document.createElement('li');
    li.textContent = step;
    ol.append(li);
  }
  div.append(h, ol);
  const src = document.createElement('p');
  src.className = 'sources';
  const b = document.createElement('b');
  b.textContent = 'Sources: ';
  src.append(b, t.sources.join(' · '));
  if (t.count) {
    const count = document.createElement('span');
    count.textContent = ` · Count tracked: ${t.count.toLocaleString('en-US')}.`;
    src.append(count);
  }
  div.append(src);
  return div;
}

function renderList() {
  const list = document.getElementById('trophyList');
  const shown = visibleTrophies();
  list.replaceChildren();
  document.getElementById('emptyNote').hidden = shown.length > 0;
  document.getElementById('listMeta').textContent =
    `Showing ${shown.length} of ${trophies.length} trophies` +
    (state.kind === 'online' ? ' — this list has no online trophies.' : '') +
    (state.spoiler ? ' · Spoiler hiding is on: un-earned story trophies are masked.' : '');
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophy' + (earned.has(t.name) ? ' is-earned' : '');
    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'trophy-check';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', `Mark ${t.name} earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveProgress();
      renderAll();
    });
    const main = document.createElement('div');
    main.className = 'trophy-main';
    const name = document.createElement('p');
    name.className = 'trophy-name';
    if (isSpoilerHidden(t)) {
      name.textContent = 'Story trophy — hidden until earned';
      name.classList.add('spoiler-mask');
    } else {
      name.textContent = t.name;
      if (earned.has(t.name)) {
        const mark = document.createElement('span');
        mark.className = 'earned-mark';
        mark.textContent = '✓ Earned';
        name.append(mark);
      }
    }
    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = isSpoilerHidden(t)
      ? 'Complete the story to reveal this trophy.'
      : t.description;
    if (isSpoilerHidden(t)) desc.classList.add('spoiler-mask');
    const tags = document.createElement('div');
    tags.className = 'tags';
    const gradeTag = document.createElement('span');
    gradeTag.className = `tag grade-${t.grade}`;
    gradeTag.textContent = gradeLabel(t);
    tags.append(gradeTag);
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = t.kind;
    tags.append(kindTag);
    if (t.missable) {
      const m = document.createElement('span');
      m.className = 'tag missable';
      m.textContent = 'Missable';
      tags.append(m);
    }
    if (t.hidden) {
      const h = document.createElement('span');
      h.className = 'tag hidden-t';
      h.textContent = 'Hidden on PSN';
      tags.append(h);
    }
    if (t.count) {
      const c = document.createElement('span');
      c.className = 'tag';
      c.textContent = `× ${t.count.toLocaleString('en-US')}`;
      tags.append(c);
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'guide-toggle';
    const isOpen = state.openId === t.id;
    toggle.textContent = isOpen ? 'Hide the guide ▲' : 'Read the guide ▼';
    main.append(name, desc, tags, toggle);
    if (isOpen && !isSpoilerHidden(t)) main.append(buildGuidePanel(t));
    if (isOpen && isSpoilerHidden(t)) {
      const masked = document.createElement('p');
      masked.className = 'guide spoiler-mask';
      masked.textContent = 'Earn this trophy to reveal its guide, or turn spoiler hiding off.';
      main.append(masked);
    }
    toggle.addEventListener('click', () => {
      state.openId = state.openId === t.id ? null : t.id;
      renderList();
    });
    head.append(box, main);
    li.append(head);
    list.append(li);
  }
}

function renderRoadmap() {
  const ol = document.getElementById('roadmap');
  ol.replaceChildren();
  for (const stage of STAGES) {
    const members = trophies.filter((t) => t.stage === stage.n);
    const done = members.filter((t) => earned.has(t.name)).length;
    const li = document.createElement('li');
    li.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `${done}/${members.length} earned`;
    h.append(count);
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    fill.style.width = `${Math.round((done / members.length) * 100)}%`;
    bar.append(fill);
    const p = document.createElement('p');
    p.textContent = stage.text;
    const chips = document.createElement('div');
    chips.className = 'stage-trophies';
    for (const t of members) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'stage-trophy' + (earned.has(t.name) ? ' is-earned' : '');
      chip.textContent = (earned.has(t.name) ? '✓ ' : '') + t.name + (t.missable ? ' ⚠' : '');
      chip.addEventListener('click', () => {
        state.view = 'checklist';
        state.kind = 'all';
        state.grade = 'all';
        state.search = '';
        state.openId = t.id;
        document.getElementById('search').value = '';
        renderAll();
        document.getElementById('trophyList').scrollIntoView({ block: 'start' });
      });
      chips.append(chip);
    }
    li.append(h, bar, p, chips);
    ol.append(li);
  }
}

function renderView() {
  const isRoadmap = state.view === 'roadmap';
  document.getElementById('checklistView').hidden = isRoadmap;
  document.getElementById('roadmapView').hidden = !isRoadmap;
  document.getElementById('toolbar').style.display = isRoadmap ? 'none' : '';
  document.getElementById('tabChecklist').classList.toggle('is-active', !isRoadmap);
  document.getElementById('tabRoadmap').classList.toggle('is-active', isRoadmap);
  if (isRoadmap) renderRoadmap();
}

function renderAll() {
  renderProgress();
  renderChips();
  renderView();
  renderList();
}

function exportProgress() {
  const payload = { app: 'leonida-trophy-atlas', version: 1, exportedAt: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const known = new Set(trophies.map((t) => t.name));
    const good = names.filter((n) => known.has(n));
    if (!good.length) throw new Error('no known trophies');
    earned = new Set(good);
    saveProgress();
    renderAll();
  } catch {
    alert('That file is not a Leonida Trophy Atlas progress export.');
  }
}

document.getElementById('tabChecklist').addEventListener('click', () => { state.view = 'checklist'; renderAll(); });
document.getElementById('tabRoadmap').addEventListener('click', () => { state.view = 'roadmap'; renderAll(); });
document.getElementById('search').addEventListener('input', (e) => { state.search = e.target.value; renderList(); });
document.getElementById('gradeFilter').addEventListener('change', (e) => { state.grade = e.target.value; renderAll(); });
document.getElementById('spoilerToggle').addEventListener('change', (e) => { state.spoiler = e.target.checked; renderList(); });
document.getElementById('earnedOnly').addEventListener('change', (e) => { state.earnedOnly = e.target.checked; renderList(); });
document.getElementById('exportBtn').addEventListener('click', exportProgress);
document.getElementById('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Clear all earned trophies?')) { earned = new Set(); saveProgress(); renderAll(); }
});

// Apply URL params to the controls, then render.
document.getElementById('search').value = state.search;
document.getElementById('gradeFilter').value = state.grade;
document.getElementById('spoilerToggle').checked = state.spoiler;
document.getElementById('earnedOnly').checked = state.earnedOnly;
renderAll();
