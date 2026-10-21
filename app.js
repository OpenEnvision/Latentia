(() => {
  'use strict';
  const STORAGE_KEY = 'latentia-saved-v1';
  const TYPE_LABELS = { image: 'Image', film: 'Film', installation: 'Installation' };
  const FILM_FORMS = { short: 'Short films', music: 'Music & dance', process: 'Process studies' };
  const LENGTH_LABELS = { 'under-five': 'Up to 5 min', 'five-ten': '5–10 min', 'over-ten': 'Over 10 min' };
  const FEATURED_FILM_IDS = ['a-face-only-a-mother-could-love', 'tale-of-the-peony', 'witch-olivia-qiu'];
  const artworkById = new Map();
  const artworks = (Array.isArray(window.LATENTIA_ARTWORKS) ? window.LATENTIA_ARTWORKS : []).filter((work) => {
    if (!work || typeof work.id !== 'string' || !work.id || artworkById.has(work.id)) return false;
    artworkById.set(work.id, work);
    return true;
  });
  const ordinals = new Map(artworks.map((work, i) => [work.id, i + 1]));
  const normalize = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
  const searchIndex = new Map(artworks.map((work) => [work.id, normalize([
    work.title, work.zh, work.author, work.institution, work.category, work.medium,
    work.technology, work.productionCredit, work.description, work.descriptionZh,
    work.year, TYPE_LABELS[work.type], FILM_FORMS[work.filmFormat]
  ].join(' '))]));
  const filmForm = (work) => Object.hasOwn(FILM_FORMS, work.filmFormat) ? work.filmFormat : 'short';
  function runningTime(work) {
    if (Number.isFinite(work.durationSeconds) && work.durationSeconds > 0) return work.durationSeconds;
    const parts = String(work.duration || '').match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
    if (!parts) return null;
    const seconds = parts[3] === undefined ? Number(parts[1]) * 60 + Number(parts[2])
      : Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3]);
    return seconds > 0 ? seconds : null;
  }
  const yearValue = (work) => Math.max(0, ...(String(work.year || '').match(/\d{4}/g) || []).map(Number));

  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function safeImageUrl(value) {
    const webUrl = safeUrl(value);
    if (webUrl || window.location.protocol !== 'file:') return webUrl;
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const directory = new URL('./', window.location.href);
      const url = new URL(value, directory);
      return url.protocol === 'file:' && !url.host && url.href.startsWith(directory.href) ? url.href : '';
    } catch { return ''; }
  }
  function setLink(link, label, value) {
    if (!link) return;
    link.textContent = label || '';
    const url = safeUrl(value);
    if (url) {
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else ['href', 'target', 'rel'].forEach((attribute) => link.removeAttribute(attribute));
  }
  function credit(label, url) {
    const result = node(safeUrl(url) ? 'a' : 'span');
    if (result.tagName === 'A') setLink(result, label, url);
    else result.textContent = label || '';
    return result;
  }
  function parseSaved(raw) {
    try {
      const parsed = JSON.parse(raw || '[]');
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => artworkById.has(id)) : []);
    } catch { return new Set(); }
  }
  function icon(kind) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    const path = document.createElementNS(ns, 'path');
    svg.setAttribute('viewBox', kind === 'bookmark' ? '0 0 24 28' : '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none');
    path.setAttribute('d', kind === 'bookmark' ? 'M5 3h14v22l-7-5-7 5V3Z' : 'm9 5 11 7-11 7V5Z');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.3');
    path.setAttribute('stroke-linejoin', 'round');
    if (kind === 'play') path.setAttribute('fill', 'currentColor');
    svg.append(path);
    return svg;
  }

  function init() {
    const get = (id) => document.getElementById(id);
    const grid = get('gallery-grid');
    if (!grid) return;
    const typeButtons = Array.from(document.querySelectorAll('[data-type]'));
    const themeFilter = get('theme-filter');
    const sortSelect = get('browse-sort');
    const filmFilters = get('film-filters');
    const formatSelect = get('film-format');
    const lengthSelect = get('film-length');
    const searchInput = get('collection-search');
    const searchClear = get('search-clear');
    const filterReset = get('filter-reset');
    const workCount = get('work-count');
    const collectionSummary = get('collection-summary');
    const savedToggle = get('saved-toggle');
    const savedCount = get('saved-count');
    const emptyState = get('empty-state');
    const emptyTitle = get('empty-title');
    const emptyDescription = get('empty-description');
    const emptyReset = get('empty-reset');
    const status = get('status-message');
    const collection = get('collection');
    const screeningRoom = get('screening-room');
    const screeningFeature = get('screening-feature');
    const screeningOptions = get('screening-options');
    const featuredFilms = FEATURED_FILM_IDS.map((id) => artworkById.get(id)).filter((work) => work?.type === 'film' && work.video);
    const detailDialog = get('artwork-dialog');
    const aboutDialog = get('about-dialog');
    const aboutOpen = get('about-open');
    const filmsOpen = get('films-open');
    const detailMedia = get('detail-media');
    const detailSave = get('detail-save');
    const detailPrev = get('detail-prev');
    const detailNext = get('detail-next');
    const detailIndex = get('detail-index');
    const filmToolbar = get('film-toolbar');
    const filmContext = get('film-context');
    const playerReload = get('player-reload');
    const cards = new Map();
    const saveButtons = new Map();
    const dialogOpeners = new WeakMap();
    const categories = Array.from(new Set(artworks.map((work) => work.category).filter(Boolean)));
    typeButtons.forEach((button) => {
      const counter = button.querySelector('.type-count');
      if (counter) counter.textContent = String(artworks.filter((work) => work.type === button.dataset.type).length).padStart(2, '0');
    });
    let type = 'all';
    let category = 'all';
    let format = 'all';
    let length = 'all';
    let sort = 'curated';
    let query = '';
    let savedOnly = false;
    let selectedId = artworks[0]?.id || '';
    let visible = [];
    let detailWorks = [];
    let statusTimer;
    let searchTimer;
    let mediaRevision = 0;
    let saved;
    try { saved = parseSaved(window.localStorage.getItem(STORAGE_KEY)); }
    catch { saved = new Set(); }

    if (themeFilter) {
      const options = [node('option', '', 'All themes')];
      options[0].value = 'all';
      categories.forEach((name) => {
        const option = node('option', '', name);
        option.value = name;
        options.push(option);
      });
      themeFilter.replaceChildren(...options);
    }

    function announce(message) {
      if (!status) return;
      window.clearTimeout(statusTimer);
      status.textContent = message;
      statusTimer = window.setTimeout(() => { status.textContent = ''; }, 4000);
    }
    function persistSaved() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(saved)));
        return true;
      } catch { return false; }
    }
    function makePoster(work, host, eager = false) {
      const image = node('img');
      image.alt = work.alt || `${work.title} — ${work.author || 'AI artwork'}`;
      image.width = Number(work.width) || 1600;
      image.height = Number(work.height) || 1000;
      image.loading = eager ? 'eager' : 'lazy';
      image.decoding = 'async';
      const fail = () => {
        if (!host.contains(image)) return;
        image.hidden = true;
        host.classList.add('media-failed');
        if (!host.querySelector('.media-error')) host.append(node('span', 'media-error', 'Preview unavailable · 預覽暫不可用'));
      };
      image.addEventListener('error', fail, { once: true });
      host.append(image);
      const src = safeImageUrl(work.image);
      if (src) image.src = src;
      else fail();
      return image;
    }
    function showScreening(work) {
      if (!screeningFeature || !work) return;
      const imageButton = node('button', 'screening-poster');
      imageButton.type = 'button';
      imageButton.dataset.openArtwork = work.id;
      imageButton.dataset.playFilm = work.id;
      imageButton.setAttribute('aria-label', `Watch featured film: ${work.title}, by ${work.author}`);
      makePoster(work, imageButton);
      const invitation = node('span', 'screening-play');
      invitation.append(icon('play'), node('span', '', 'Watch film'));
      imageButton.append(invitation);
      const info = node('div', 'screening-information');
      const metadata = node('p', 'screening-meta mono', [work.year, work.duration, work.category].filter(Boolean).join(' · '));
      const title = node('h4', 'screening-title', work.title);
      const subtitle = node('p', 'screening-subtitle', work.zh);
      subtitle.lang = 'zh-Hant';
      const author = node('p', 'screening-author');
      author.append(credit(work.author, work.authorUrl));
      const institution = node('p', 'screening-institution', `${work.institutionRole} · `);
      institution.append(credit(work.institution, work.institutionUrl));
      const description = node('p', 'screening-description', work.descriptionZh || work.description);
      description.lang = work.descriptionZh ? 'zh-Hant' : 'en';
      const source = credit('Official source ↗', work.sourceUrl || work.video.watchUrl);
      source.className = 'screening-source';
      info.append(metadata, title, subtitle, author, institution, description, source);
      screeningFeature.replaceChildren(imageButton, info);
      screeningOptions?.querySelectorAll('[data-screening]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.screening === work.id)));
    }
    if (screeningOptions) {
      const options = featuredFilms.map((work, index) => {
        const button = node('button', 'screening-option');
        button.type = 'button';
        button.dataset.screening = work.id;
        button.setAttribute('aria-controls', 'screening-feature');
        button.setAttribute('aria-pressed', String(index === 0));
        button.setAttribute('aria-label', `Feature ${work.title}`);
        button.append(node('span', 'mono screening-number', String(index + 1).padStart(2, '0')), node('span', 'screening-option-title', work.title), node('span', 'mono screening-runtime', work.duration));
        button.addEventListener('click', () => showScreening(work));
        return button;
      });
      screeningOptions.replaceChildren(...options);
      showScreening(featuredFilms[0]);
    }
    function createCard(work) {
      const article = node('article', 'artwork');
      article.dataset.artwork = work.id;
      article.dataset.mediaType = work.type;
      const imageButton = node('button', 'artwork-image');
      imageButton.type = 'button';
      imageButton.dataset.openArtwork = work.id;
      if (work.type === 'film' && work.video) imageButton.dataset.playFilm = work.id;
      imageButton.setAttribute('aria-label', `${work.type === 'film' ? 'Watch film' : 'View artwork'}: ${work.title} / ${work.zh || ''}, by ${work.author || ''}`);
      makePoster(work, imageButton);
      const label = node('span', 'media-label');
      label.setAttribute('aria-hidden', 'true');
      if (work.type === 'film') label.append(icon('play'));
      label.append(node('span', '', `${TYPE_LABELS[work.type] || 'Artwork'}${work.year ? ` · ${work.year}` : ''}${work.duration ? ` · ${work.duration}` : ''}${work.original ? ' · Original' : ''}`));
      imageButton.append(label);
      if (work.type === 'film') {
        const invitation = node('span', 'film-invitation');
        invitation.setAttribute('aria-hidden', 'true');
        invitation.append(icon('play'));
        imageButton.append(invitation);
      }
      const caption = node('div', 'artwork-caption');
      const text = node('div', 'artwork-caption-text');
      const title = node('button', 'artwork-title', `${String(ordinals.get(work.id)).padStart(2, '0')} / ${work.title}`);
      title.type = 'button';
      title.dataset.openArtwork = work.id;
      const author = node('p', 'artwork-author');
      author.append(credit(work.author, work.authorUrl));
      const institution = node('p', 'artwork-institution');
      if (work.institutionRole) institution.append(document.createTextNode(`${work.institutionRole} · `));
      institution.append(credit(work.institution, work.institutionUrl));
      const meta = node('p', 'artwork-meta', [work.medium, work.year].filter(Boolean).join(' · '));
      text.append(title, author, institution, meta);
      if (work.type === 'film' && (work.descriptionZh || work.description)) {
        const synopsis = node('p', 'artwork-synopsis', work.descriptionZh || work.description);
        synopsis.lang = work.descriptionZh ? 'zh-Hant' : 'en';
        text.append(synopsis);
      }
      const save = node('button', 'save-button');
      save.type = 'button';
      save.dataset.save = work.id;
      save.append(icon('bookmark'));
      saveButtons.set(work.id, save);
      caption.append(text, save);
      article.append(imageButton, caption);
      cards.set(work.id, article);
    }
    artworks.forEach(createCard);

    function updateSaveButton(button, work, detail = false) {
      if (!button || !work) return;
      const isSaved = saved.has(work.id);
      button.setAttribute('aria-pressed', String(isSaved));
      button.setAttribute('aria-label', `${isSaved ? 'Unsave' : 'Save'} ${work.title}`);
      button.classList.toggle('is-saved', isSaved);
      if (detail) {
        const label = button.querySelector('[data-save-label], span');
        if (label) label.textContent = isSaved ? 'Saved to collection' : 'Save artwork';
      } else button.title = `${isSaved ? 'Unsave' : 'Save'} ${work.title}`;
    }
    function syncSaveControls() {
      artworks.forEach((work) => updateSaveButton(saveButtons.get(work.id), work));
      updateSaveButton(detailSave, artworkById.get(selectedId), true);
      if (savedCount) savedCount.textContent = String(saved.size);
      if (savedToggle) {
        savedToggle.setAttribute('aria-pressed', String(savedOnly));
        savedToggle.classList.toggle('is-active', savedOnly);
      }
    }
    function findVisible() {
      const terms = query.split(/\s+/).filter(Boolean);
      const result = artworks.filter((work) => (type === 'all' || work.type === type)
        && (category === 'all' || work.category === category)
        && (!savedOnly || saved.has(work.id))
        && (type !== 'film' || format === 'all' || filmForm(work) === format)
        && (type !== 'film' || length === 'all' || matchesLength(work))
        && terms.every((term) => searchIndex.get(work.id).includes(term)));
      if (sort === 'newest') result.sort((a, b) => yearValue(b) - yearValue(a) || ordinals.get(a.id) - ordinals.get(b.id));
      else if (sort === 'duration' && type === 'film') result.sort((a, b) => {
        const aTime = runningTime(a); const bTime = runningTime(b);
        if (aTime === null || bTime === null) return aTime === bTime ? 0 : aTime === null ? 1 : -1;
        return aTime - bTime || ordinals.get(a.id) - ordinals.get(b.id);
      });
      return result;
    }
    function matchesLength(work) {
      const seconds = runningTime(work);
      if (seconds === null) return false;
      if (length === 'under-five') return seconds <= 300;
      if (length === 'five-ten') return seconds > 300 && seconds <= 600;
      if (length === 'over-ten') return seconds > 600;
      return true;
    }
    function focusCardAt(index, selector = '.artwork-image') {
      const work = visible[Math.min(Math.max(index, 0), visible.length - 1)];
      const target = work && cards.get(work.id)?.querySelector(selector);
      (target || savedToggle || typeButtons[0] || searchInput)?.focus({ preventScroll: true });
    }
    function navigationWorks() {
      return detailWorks;
    }
    function syncDetailNavigation() {
      const works = navigationWorks();
      const index = works.findIndex((work) => work.id === selectedId);
      const isFilm = works.length > 0 && works.every((work) => work.type === 'film');
      if (detailIndex) detailIndex.textContent = `${index < 0 ? '—' : String(index + 1).padStart(2, '0')} / ${String(works.length).padStart(2, '0')}${isFilm ? (works.length === 1 ? ' film' : ' films') : ''}`;
      const disabled = !works.length || (works.length === 1 && works[0].id === selectedId);
      if (detailPrev) {
        detailPrev.disabled = disabled;
        const previous = works[index < 0 ? works.length - 1 : (index - 1 + works.length) % works.length];
        detailPrev.setAttribute('aria-label', previous ? `Previous ${isFilm ? 'film' : 'artwork'}: ${previous.title}` : 'Previous artwork');
      }
      if (detailNext) {
        detailNext.disabled = disabled;
        const next = works[index < 0 ? 0 : (index + 1) % works.length];
        detailNext.setAttribute('aria-label', next ? `Next ${isFilm ? 'film' : 'artwork'}: ${next.title}` : 'Next artwork');
      }
    }
    function renderGrid() {
      const active = document.activeElement;
      const activeCard = active instanceof Element ? active.closest('[data-artwork]') : null;
      const previousIndex = activeCard ? visible.findIndex((work) => work.id === activeCard.dataset.artwork) : -1;
      const activeSave = active instanceof Element && active.matches('[data-save]');
      visible = findVisible();
      const currentIds = Array.from(grid.children, (child) => child.dataset.artwork).join('\u0000');
      if (currentIds !== visible.map((work) => work.id).join('\u0000')) grid.replaceChildren(...visible.map((work) => cards.get(work.id)));
      if (previousIndex >= 0 && active instanceof HTMLElement) {
        if (active.isConnected) active.focus({ preventScroll: true });
        else focusCardAt(previousIndex, activeSave ? '.save-button' : '.artwork-image');
      }
      if (workCount) workCount.textContent = `${visible.length} ${visible.length === 1 ? 'work' : 'works'}`;
      const hasFilters = type !== 'all' || category !== 'all' || Boolean(query) || savedOnly || sort !== 'curated';
      if (screeningRoom) screeningRoom.hidden = !featuredFilms.length || savedOnly || Boolean(query) || category !== 'all' || format !== 'all' || length !== 'all' || sort !== 'curated' || !['all', 'film'].includes(type);
      if (filmFilters) filmFilters.hidden = type !== 'film';
      if (formatSelect) formatSelect.value = format;
      if (lengthSelect) lengthSelect.value = length;
      if (sortSelect) {
        sortSelect.value = sort;
        const durationOption = sortSelect.querySelector('option[value="duration"]');
        if (durationOption) { durationOption.hidden = type !== 'film'; durationOption.disabled = type !== 'film'; }
      }
      if (collectionSummary) {
        const scope = type === 'all' ? artworks : artworks.filter((work) => work.type === type);
        const noun = type === 'film' ? 'films' : type === 'image' ? 'images' : type === 'installation' ? 'installations' : 'works';
        const details = [category !== 'all' ? category : '', format !== 'all' ? FILM_FORMS[format] : '', length !== 'all' ? LENGTH_LABELS[length] : '', sort === 'newest' ? 'Newest first' : sort === 'duration' ? 'Shortest first' : '', savedOnly ? 'Your saved collection' : ''].filter(Boolean);
        collectionSummary.textContent = hasFilters ? [`${visible.length} of ${scope.length} ${noun}`, ...details].join(' · ')
          : `${artworks.length} works across images, films, and imagined worlds.`;
      }
      if (emptyState) emptyState.hidden = visible.length !== 0;
      if (emptyTitle) emptyTitle.textContent = savedOnly && saved.size === 0 ? 'Your collection starts here.' : 'Nothing in this corner. Yet.';
      if (emptyDescription) emptyDescription.textContent = savedOnly && saved.size === 0
        ? 'Save an image or a film that stays with you, then return here.'
        : 'Try another title, creator, institution, or a different set of filters.';
      if (filterReset) filterReset.hidden = !hasFilters;
      if (searchClear) searchClear.hidden = !searchInput?.value;
      typeButtons.forEach((button) => {
        const activeType = button.dataset.type === type;
        button.setAttribute('aria-pressed', String(activeType));
        button.classList.toggle('is-active', activeType);
      });
      if (themeFilter) themeFilter.value = category;
      syncSaveControls();
      syncDetailNavigation();
      updateScrollProgress();
    }

    function cleanupMedia() {
      mediaRevision += 1;
      if (playerReload) playerReload.hidden = true;
      if (!detailMedia) return;
      detailMedia.querySelectorAll('video, audio').forEach((media) => {
        media.pause();
        media.removeAttribute('src');
        media.querySelectorAll('source').forEach((source) => source.removeAttribute('src'));
        media.load();
      });
      detailMedia.querySelectorAll('iframe').forEach((frame) => { frame.removeAttribute('src'); frame.remove(); });
      detailMedia.replaceChildren();
      detailMedia.classList.remove('media-failed', 'is-playing');
    }
    function filmFallback(work, failed = false) {
      const result = node('p', failed ? 'film-fallback media-error' : 'film-fallback');
      result.append(document.createTextNode(failed ? 'Playback unavailable here. ' : 'If playback is unavailable, '));
      const url = safeUrl(work.video?.watchUrl || work.sourceUrl);
      if (url) result.append(credit('watch on the original site ↗', url));
      else result.append(document.createTextNode('please visit the work’s source.'));
      return result;
    }
    function playFilm(work) {
      if (!detailMedia || !detailDialog?.open || selectedId !== work.id || !work.video) return;
      cleanupMedia();
      const revision = mediaRevision;
      const src = safeUrl(work.video.src);
      if (!src) {
        detailMedia.classList.add('media-failed');
        detailMedia.append(filmFallback(work, true));
        return;
      }
      detailMedia.classList.add('is-playing');
      if (playerReload) playerReload.hidden = false;
      const player = node('div', 'film-player');
      detailMedia.append(player, filmFallback(work));
      const failed = (media) => {
        if (revision !== mediaRevision || !detailMedia.contains(media)) return;
        detailMedia.querySelector('.film-fallback')?.replaceWith(filmFallback(work, true));
      };
      if (work.video.kind === 'video') {
        const video = node('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.poster = safeImageUrl(work.image);
        video.setAttribute('aria-label', `${work.title}, a film by ${work.author}`);
        video.addEventListener('error', () => failed(video), { once: true });
        video.src = src;
        player.append(video);
        video.focus({ preventScroll: true });
        const promise = video.play();
        if (promise?.catch) promise.catch(() => {
          if (revision === mediaRevision && detailMedia.contains(video)) announce('Use the video controls to start playback.');
        });
      } else if (['youtube', 'vimeo'].includes(work.video.kind)) {
        const url = new URL(src);
        url.searchParams.set('autoplay', '1');
        if (work.video.kind === 'vimeo') url.searchParams.set('dnt', '1');
        const frame = node('iframe');
        frame.title = `${work.title} — a film by ${work.author}`;
        frame.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.allowFullscreen = true;
        frame.addEventListener('error', () => failed(frame), { once: true });
        frame.src = url.href;
        player.append(frame);
        frame.focus({ preventScroll: true });
      } else {
        detailMedia.classList.add('media-failed');
        detailMedia.append(filmFallback(work, true));
      }
    }
    function renderDetailMedia(work) {
      cleanupMedia();
      if (!detailMedia) return;
      makePoster(work, detailMedia, true);
      if (work.type === 'film' && work.video) {
        const play = node('button', 'play-film');
        play.type = 'button';
        play.setAttribute('aria-label', `Play ${work.title} by ${work.author}`);
        play.append(icon('play'), node('span', '', 'Play film'));
        play.addEventListener('click', () => playFilm(work), { once: true });
        detailMedia.append(play);
      }
    }
    function updateDetail() {
      const work = artworkById.get(selectedId);
      if (!work) return;
      const write = (id, text) => { const target = get(id); if (target) target.textContent = text || ''; };
      write('detail-title', work.title);
      write('detail-zh', work.zh);
      write('detail-category', [TYPE_LABELS[work.type] || 'Artwork', work.category].filter(Boolean).join(' / '));
      write('detail-description', [work.description, work.descriptionZh].filter(Boolean).join(' '));
      write('detail-credit', work.imageCredit);
      setLink(get('detail-author'), work.author, work.authorUrl);
      setLink(get('detail-institution'), work.institution, work.institutionUrl);
      write('detail-institution-role', work.institutionRole || 'Institution');
      write('detail-year', work.year || '—');
      write('detail-medium', [work.medium || TYPE_LABELS[work.type] || 'AI artwork', work.duration].filter(Boolean).join(' · '));
      if (filmToolbar) filmToolbar.hidden = work.type !== 'film';
      if (filmContext) filmContext.textContent = work.type === 'film'
        ? [FILM_FORMS[filmForm(work)], work.duration || 'Runtime not listed', work.video?.kind === 'youtube' ? 'YouTube' : work.video?.kind === 'vimeo' ? 'Vimeo' : 'Official video'].join(' · ') : '';
      [['detail-production', work.productionCredit], ['detail-technology', work.technology], ['detail-year-note', [work.yearNote, work.durationNote].filter(Boolean).join(' ')]].forEach(([id, text]) => {
        const target = get(id);
        if (target) { target.textContent = text || ''; target.hidden = !text; }
      });
      const source = get('detail-source');
      if (source) {
        setLink(source, work.sourceLabel || 'View original source ↗', work.sourceUrl);
        source.hidden = !safeUrl(work.sourceUrl);
      }
      write('detail-original-note', work.original
        ? 'OpenEnvision｜Latentia Studio · Original concept. An AI-generated concept work created for this exhibition.'
        : 'Curated reference · Authorship remains with the credited creators. View the original source for the complete work.');
      if (get('detail-original-note')) get('detail-original-note').hidden = !work.original;
      syncSaveControls();
      syncDetailNavigation();
      renderDetailMedia(work);
    }
    function toggleSaved(id) {
      const work = artworkById.get(id);
      if (!work) return;
      const wasSaved = saved.has(id);
      if (wasSaved) saved.delete(id); else saved.add(id);
      const persisted = persistSaved();
      if (savedOnly) renderGrid(); else syncSaveControls();
      announce(`${work.title} ${wasSaved ? 'removed from' : 'added to'} your collection.${persisted ? '' : ' Browser storage is unavailable; changes last for this visit.'}`);
    }
    function rememberOpener(dialog, opener) {
      if (!(opener instanceof HTMLElement)) return;
      dialogOpeners.set(dialog, {
        element: opener, artworkId: opener.dataset.openArtwork,
        titleButton: opener.classList.contains('artwork-title'),
        index: visible.findIndex((work) => work.id === opener.dataset.openArtwork)
      });
    }
    function openArtwork(id, opener) {
      if (!artworkById.has(id) || !detailDialog) return;
      // Keep the opening collection order throughout this detail session.
      const scope = opener?.closest('.screening-room') ? visible.filter((work) => work.type === 'film') : visible;
      detailWorks = scope.some((work) => work.id === id) ? scope.slice() : [artworkById.get(id)];
      selectedId = id;
      updateDetail();
      if (!detailDialog.open) {
        rememberOpener(detailDialog, opener);
        detailDialog.showModal();
      }
      detailDialog.scrollTop = 0;
    }
    function stepArtwork(direction) {
      const works = navigationWorks();
      if (!works.length) return;
      const index = works.findIndex((work) => work.id === selectedId);
      const next = index < 0 ? (direction > 0 ? 0 : works.length - 1) : (index + direction + works.length) % works.length;
      if (works[next].id === selectedId) return;
      const continueWatching = detailMedia?.classList.contains('is-playing');
      selectedId = works[next].id;
      updateDetail();
      if (continueWatching && works[next].type === 'film') playFilm(works[next]);
      if (detailDialog) detailDialog.scrollTop = 0;
    }
    function scrollToCollection() {
      collection?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    function resetFilters(restoreFocus = true) {
      window.clearTimeout(searchTimer);
      type = 'all'; category = 'all'; format = 'all'; length = 'all'; sort = 'curated'; query = ''; savedOnly = false;
      if (searchInput) searchInput.value = '';
      renderGrid();
      if (restoreFocus) (typeButtons.find((button) => button.dataset.type === 'all') || searchInput)?.focus({ preventScroll: true });
    }

    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const opener = event.target.closest('[data-open-artwork]');
      if (opener) {
        openArtwork(opener.dataset.openArtwork, opener);
        if (opener.dataset.playFilm) playFilm(artworkById.get(opener.dataset.playFilm));
        return;
      }
      const save = event.target.closest('[data-save]');
      if (save && grid.contains(save)) toggleSaved(save.dataset.save);
    });
    typeButtons.forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.type !== 'all' && !Object.hasOwn(TYPE_LABELS, button.dataset.type)) return;
      type = button.dataset.type;
      if (type !== 'film') { format = 'all'; length = 'all'; if (sort === 'duration') sort = 'curated'; }
      renderGrid();
    }));
    themeFilter?.addEventListener('change', () => {
      category = categories.includes(themeFilter.value) ? themeFilter.value : 'all';
      renderGrid();
    });
    formatSelect?.addEventListener('change', () => {
      format = Object.hasOwn(FILM_FORMS, formatSelect.value) ? formatSelect.value : 'all';
      renderGrid();
    });
    lengthSelect?.addEventListener('change', () => {
      length = Object.hasOwn(LENGTH_LABELS, lengthSelect.value) ? lengthSelect.value : 'all';
      renderGrid();
    });
    sortSelect?.addEventListener('change', () => {
      sort = ['curated', 'newest'].includes(sortSelect.value) || (type === 'film' && sortSelect.value === 'duration') ? sortSelect.value : 'curated';
      renderGrid();
    });
    searchInput?.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      if (searchClear) searchClear.hidden = !searchInput.value;
      searchTimer = window.setTimeout(() => { query = normalize(searchInput.value); renderGrid(); }, 150);
    });
    searchInput?.addEventListener('search', () => {
      window.clearTimeout(searchTimer);
      query = normalize(searchInput.value);
      renderGrid();
    });
    searchClear?.addEventListener('click', () => {
      window.clearTimeout(searchTimer);
      if (searchInput) searchInput.value = '';
      query = '';
      renderGrid();
      searchInput?.focus({ preventScroll: true });
    });
    filterReset?.addEventListener('click', () => resetFilters());
    emptyReset?.addEventListener('click', () => resetFilters());
    savedToggle?.addEventListener('click', () => { savedOnly = !savedOnly; renderGrid(); scrollToCollection(); });
    function showFilms() { resetFilters(false); type = 'film'; renderGrid(); scrollToCollection(); }
    filmsOpen?.addEventListener('click', showFilms);
    detailSave?.addEventListener('click', () => toggleSaved(selectedId));
    detailPrev?.addEventListener('click', () => stepArtwork(-1));
    detailNext?.addEventListener('click', () => stepArtwork(1));
    playerReload?.addEventListener('click', () => {
      const work = artworkById.get(selectedId);
      if (work?.type === 'film') playFilm(work);
    });
    function showAbout() {
      if (!aboutDialog || aboutDialog.open) return;
      rememberOpener(aboutDialog, aboutOpen);
      aboutDialog.showModal();
    }
    aboutOpen?.addEventListener('click', showAbout);
    function followPageLink() {
      if (window.location.hash === '#films') showFilms();
      if (window.location.hash === '#about') showAbout();
    }
    window.addEventListener('hashchange', followPageLink);
    [detailDialog, aboutDialog].filter(Boolean).forEach((dialog) => {
      dialog.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => dialog.close()));
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (dialog === detailDialog) cleanupMedia();
        const opener = dialogOpeners.get(dialog);
        if (!opener) return;
        window.requestAnimationFrame(() => {
          if (document.querySelector('dialog[open]')) return;
          if (opener.element.isConnected) { opener.element.focus({ preventScroll: true }); return; }
          const card = cards.get(opener.artworkId);
          if (card?.isConnected) { card.querySelector(opener.titleButton ? '.artwork-title' : '.artwork-image')?.focus({ preventScroll: true }); return; }
          focusCardAt(opener.index < 0 ? 0 : opener.index, opener.titleButton ? '.artwork-title' : '.artwork-image');
        });
      });
    });
    document.addEventListener('keydown', (event) => {
      if (!detailDialog?.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, video, audio, iframe, [role="slider"], [contenteditable]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        stepArtwork(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      saved = parseSaved(event.key === null ? null : event.newValue);
      if (savedOnly) renderGrid(); else syncSaveControls();
    });
    let scrollFramePending = false;
    function updateScrollProgress() {
      const progress = get('scroll-progress');
      if (!progress) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.style.width = `${ratio * 100}%`;
    }
    function scheduleScrollProgress() {
      if (scrollFramePending) return;
      scrollFramePending = true;
      window.requestAnimationFrame(() => { updateScrollProgress(); scrollFramePending = false; });
    }
    window.addEventListener('scroll', scheduleScrollProgress, { passive: true });
    window.addEventListener('resize', scheduleScrollProgress, { passive: true });
    window.addEventListener('load', scheduleScrollProgress, { once: true });
    renderGrid();
    followPageLink();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
