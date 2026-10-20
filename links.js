'use strict';

(() => {
  const languageKey = 'latentia-recommend-language-v1';
  const cards = Array.from(document.querySelectorAll('[data-resource]'));
  const search = document.getElementById('links-search');
  const scope = document.getElementById('links-language-filter');
  const filters = Array.from(document.querySelectorAll('[data-category-filter]'));
  const languageButtons = Array.from(document.querySelectorAll('[data-language]'));
  const count = document.getElementById('links-count');
  const reset = document.getElementById('links-reset');
  const clear = document.getElementById('links-search-clear');
  const empty = document.getElementById('links-empty');
  const languageStatus = document.getElementById('language-status');
  const copy = {
    zh: { title: '相关链接 · Links — Latentia', description: '由 OpenEnvision 旗下 Latentia 精选的全球 AIGC 艺术社区、AI 微电影展映、艺术策展与创作资源。', search: '搜索平台、影片、模型、工作流…', searchLabel: '搜索相关平台', clear: '清除搜索', nav: '主导航', home: 'Latentia 首页', resources: '精选相关平台', categories: '按平台类别筛选', changed: '语言已切换，筛选与搜索已保留。', count: (n) => `${n} / ${cards.length} 个精选平台`, newTab: '在新标签页打开官网' },
    en: { title: 'Related links — Latentia', description: 'AI art communities, film showcases, curated exhibitions and creative resources from around the world, selected by Latentia, part of OpenEnvision.', search: 'Search platforms, films, models, workflows…', searchLabel: 'Search related platforms', clear: 'Clear search', nav: 'Main navigation', home: 'Latentia home', resources: 'Selected related platforms', categories: 'Filter by platform category', changed: 'Language changed. Your search and filters have been kept.', count: (n) => `${n} / ${cards.length} selected platforms`, newTab: 'Open the official website in a new tab' }
  };
  let language = 'zh';
  let category = 'all';
  try { if (localStorage.getItem(languageKey) === 'en') language = 'en'; } catch { /* Switching works without storage. */ }
  const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase().trim();
  const searchIndex = new Map(cards.map((card) => [card, normalize([
    card.textContent, card.dataset.keywords,
    ...Array.from(card.querySelectorAll('[data-zh][data-en]'), (element) => `${element.dataset.zh} ${element.dataset.en}`)
  ].join(' '))]));

  function render() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const matches = cards.filter((card) => (scope.value === 'all' || card.dataset.region === scope.value) && terms.every((term) => searchIndex.get(card).includes(term)));
    const matched = new Set(matches);
    let visible = 0;
    cards.forEach((card) => {
      const show = matched.has(card) && (category === 'all' || card.dataset.category === category);
      card.hidden = !show;
      if (show) visible += 1;
    });
    filters.forEach((button) => {
      const value = button.dataset.categoryFilter;
      button.setAttribute('aria-pressed', String(value === category));
      button.querySelector('.filter-count').textContent = String(value === 'all' ? matches.length : matches.filter((card) => card.dataset.category === value).length).padStart(2, '0');
    });
    count.textContent = copy[language].count(visible);
    empty.hidden = visible > 0;
    reset.hidden = category === 'all' && scope.value === 'all' && !search.value;
    clear.hidden = !search.value;
  }

  function applyLanguage(next, { persist = true, announce = true } = {}) {
    if (!['zh', 'en'].includes(next)) return;
    language = next;
    const strings = copy[language];
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : 'en';
    document.title = strings.title;
    document.querySelector('meta[name="description"]').content = strings.description;
    document.querySelectorAll('[data-zh][data-en]').forEach((element) => { element.textContent = element.dataset[language]; });
    document.querySelectorAll('[data-label]').forEach((element) => { element.setAttribute('aria-label', strings[element.dataset.label]); });
    search.placeholder = strings.search;
    cards.forEach((card) => {
      card.querySelector('a').setAttribute('aria-label', `${card.querySelector('h2').textContent} — ${strings.newTab}`);
    });
    languageButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    render();
    if (announce) languageStatus.textContent = strings.changed;
    if (persist) { try { localStorage.setItem(languageKey, language); } catch { /* Keep the choice for this visit. */ } }
  }

  function resetFilters() {
    category = 'all';
    scope.value = 'all';
    search.value = '';
    render();
  }

  filters.forEach((button) => button.addEventListener('click', () => { category = button.dataset.categoryFilter; render(); }));
  search.addEventListener('input', render);
  scope.addEventListener('change', render);
  clear.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
  reset.addEventListener('click', resetFilters);
  document.getElementById('links-empty-reset').addEventListener('click', () => { resetFilters(); search.focus(); });
  languageButtons.forEach((button) => button.addEventListener('click', () => { if (button.dataset.language !== language) applyLanguage(button.dataset.language); }));
  window.addEventListener('storage', (event) => {
    if (event.key !== languageKey && event.key !== null) return;
    const next = event.newValue === 'en' ? 'en' : 'zh';
    if (next !== language) applyLanguage(next, { persist: false });
  });
  document.querySelectorAll('.resource-logo img').forEach((image) => {
    const showFallback = () => image.parentElement.classList.add('logo-failed');
    image.addEventListener('error', showFallback);
    if (image.complete && !image.naturalWidth) showFallback();
  });
  applyLanguage(language, { persist: false, announce: false });
  document.getElementById('language-switch').hidden = false;
  document.getElementById('links-toolbar').hidden = false;
  document.getElementById('links-status').hidden = false;
})();
