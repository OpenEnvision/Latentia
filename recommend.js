(() => {
  'use strict';
  const recipient = 'openenvision.lab@gmail.com';
  const form = document.getElementById('recommend-form');
  if (!form) return;
  const translations = window.LATENTIA_RECOMMEND_TRANSLATIONS;
  if (!translations?.zh || !translations?.en) return;
  const languageKey = 'latentia-recommend-language-v1';
  let language = 'zh';
  try { if (localStorage.getItem(languageKey) === 'en') language = 'en'; } catch { /* Switching also works without storage. */ }
  const t = (key) => translations[language][key] ?? translations.zh[key] ?? key;
  const get = (id) => document.getElementById(id);
  const preview = get('mail-preview');
  const subjectField = get('mail-subject');
  const bodyField = get('mail-body');
  const mailLink = get('mail-open');
  const downloadLink = get('mail-download');
  const status = get('copy-status');
  const languageStatus = get('language-status');
  const languageButtons = Array.from(document.querySelectorAll('[data-language]'));
  let downloadUrl = '';
  let copyText = '';
  let revision = 0;
  const fields = Array.from(form.querySelectorAll('input, textarea, select'));
  const singleLine = (value) => String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  const value = (name) => String(form.elements.namedItem(name)?.value || '').trim();
  const paragraph = (text) => text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\n/g, '\r\n');
  function revokeDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = '';
    downloadLink.removeAttribute('href');
  }
  function invalidatePreview() {
    revision += 1;
    preview.hidden = true;
    mailLink.removeAttribute('href');
    revokeDownload();
    copyText = '';
    status.textContent = '';
    languageStatus.textContent = '';
  }
  fields.forEach((field) => {
    field.addEventListener('input', () => { field.setCustomValidity(''); invalidatePreview(); });
    field.addEventListener('change', () => { field.setCustomValidity(''); invalidatePreview(); });
  });
  function validateForm() {
    fields.forEach((field) => {
      field.setCustomValidity('');
      if (field.required && !field.value.trim()) field.setCustomValidity(t('error.required'));
      else if (field.maxLength > 0 && field.value.length > field.maxLength) field.setCustomValidity(t('error.tooLong'));
      else if (field.type === 'email' && field.validity.typeMismatch) field.setCustomValidity(t('error.email'));
      if (field.type === 'url' && field.value.trim()) {
        try {
          const url = new URL(field.value.trim());
          if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Unsupported URL');
        } catch { field.setCustomValidity(t('error.url')); }
      }
    });
    return form.reportValidity();
  }
  function prepareDraft(moveFocus = true) {
    const selectedLabel = (name) => form.elements.namedItem(name).selectedOptions[0].textContent;
    const entry = (label, text) => `${t(label)}${t('mail.separator')}${singleLine(text) || t('mail.notProvided')}`;
    const subject = `${t('mail.subjectPrefix')} ${singleLine(value('title'))} — ${singleLine(value('creator'))}`;
    const body = paragraph([
      t('mail.greeting'),
      '',
      t('mail.intro'),
      '',
      t('mail.recommenderSection'),
      entry('label.recommender', value('recommender')),
      entry('label.relationship', selectedLabel('relationship')),
      entry('label.contact', value('contact')),
      '',
      t('mail.workSection'),
      entry('label.title', value('title')),
      entry('label.creator', value('creator')),
      entry('mail.institution', value('institution')),
      entry('label.medium', selectedLabel('medium')),
      entry('label.created', value('created')),
      entry('label.specifications', value('specifications')),
      '',
      `${t('label.description')}${t('mail.separator').trimEnd()}`, value('description'),
      '',
      `${t('label.technology')}${t('mail.separator').trimEnd()}`, value('technology'),
      '',
      entry('label.workUrl', value('workUrl')),
      entry('label.creatorUrl', value('creatorUrl')),
      '',
      `${t('label.notes')}${t('mail.separator').trimEnd()}`, value('notes') || t('mail.none'),
      '',
      t('mail.footer')
    ].join('\n'));
    subjectField.value = subject;
    bodyField.value = body;
    copyText = `${t('mail.to')}${t('mail.separator')}${recipient}\r\n${t('mail.subject')}${t('mail.separator')}${subject}\r\n\r\n${body}`;
    const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    mailLink.href = mailto;
    get('mail-length-note').hidden = mailto.length <= 6000;
    downloadUrl = URL.createObjectURL(new Blob(['\ufeff', copyText], { type: 'text/plain;charset=utf-8' }));
    downloadLink.href = downloadUrl;
    preview.hidden = false;
    if (moveFocus) {
      preview.focus({ preventScroll: true });
      preview.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  function applyLanguage(nextLanguage, { persist = true, announce = true } = {}) {
    if (!['zh', 'en'].includes(nextLanguage)) return;
    const hadPreview = !preview.hidden;
    invalidatePreview();
    language = nextLanguage;
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.title = t('page.title');
    document.querySelector('meta[name="description"]').content = t('page.description');
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    [['data-i18n-placeholder', 'placeholder'], ['data-i18n-aria', 'aria-label'], ['data-i18n-alt', 'alt']].forEach(([key, attribute]) => {
      document.querySelectorAll(`[${key}]`).forEach((element) => { element.setAttribute(attribute, t(element.getAttribute(key))); });
    });
    fields.forEach((field) => { field.setCustomValidity(''); });
    languageButtons.forEach((button) => { button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
    if (hadPreview) prepareDraft(false);
    if (announce) languageStatus.textContent = t(hadPreview ? 'status.changedDraft' : 'status.changed');
    if (persist) { try { localStorage.setItem(languageKey, language); } catch { /* Retain the choice for this visit. */ } }
  }
  languageButtons.forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.language !== language) applyLanguage(button.dataset.language);
  }));
  window.addEventListener('storage', (event) => {
    if (event.key !== languageKey && event.key !== null) return;
    const nextLanguage = event.newValue === 'en' ? 'en' : 'zh';
    if (nextLanguage !== language) applyLanguage(nextLanguage, { persist: false });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    invalidatePreview();
    if (validateForm()) prepareDraft();
  });
  get('mail-copy').addEventListener('click', async () => {
    if (!copyText) return;
    const currentRevision = revision;
    const textToCopy = copyText;
    try {
      await navigator.clipboard.writeText(textToCopy);
      if (currentRevision === revision) status.textContent = t('status.copied');
    } catch {
      if (currentRevision !== revision) return;
      bodyField.focus();
      bodyField.select();
      status.textContent = t('status.copyFallback');
    }
  });
  window.addEventListener('pagehide', revokeDownload);
  window.addEventListener('pageshow', () => {
    if (!preview.hidden && copyText && !downloadUrl) {
      downloadUrl = URL.createObjectURL(new Blob(['\ufeff', copyText], { type: 'text/plain;charset=utf-8' }));
      downloadLink.href = downloadUrl;
    }
  });
  applyLanguage(language, { persist: false, announce: false });
  form.querySelectorAll('fieldset').forEach((fieldset) => { fieldset.disabled = false; });
  get('language-switch').hidden = false;
})();
