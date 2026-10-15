(() => {
  'use strict';
  const data = window.PORTFOLIO;
  if (!data) return;
  const $ = (selector) => document.querySelector(selector);
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const safeUrl = (value, local = false) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, location.href);
      if (url.protocol === 'https:' || (local && ['http:', 'https:', 'file:'].includes(url.protocol) && url.origin === location.origin && !value.startsWith('//'))) return url.href;
    } catch (_) { /* Missing or invalid links stay hidden. */ }
    return null;
  };
  const link = (label, value, local = false) => {
    const href = safeUrl(value, local);
    if (!href) return null;
    const node = element('a', label, 'button secondary');
    node.href = href;
    if (!local) { node.target = '_blank'; node.rel = 'noopener noreferrer'; node.append(element('span', ' (opens in a new tab)', 'sr-only')); }
    return node;
  };
  const fields = {headline:'headline', 'sector-line':'sectorLine', education:'education', batch:'batch', location:'location', automation:'automation'};
  for (const [attribute, key] of Object.entries(fields)) {
    document.querySelectorAll(`[data-${attribute}]`).forEach(node => {node.textContent = data[key] || '';});
  }
  document.querySelectorAll('[data-link]').forEach(node => {
    const href = safeUrl(data.links[node.dataset.link]);
    if (href) node.href = href; else node.hidden = true;
  });
  for (const [id, items] of [['skills', data.skills], ['tools', data.tools]]) {
    const list = $('#' + id);
    if (list) list.replaceChildren(...items.map(item => element('li', item)));
  }
  const skillsRoot = $('#skill-groups');
  if (skillsRoot && data.skillGroups) {
    skillsRoot.replaceChildren(...data.skillGroups.map((group,index) => {
      const card = element('article', null, 'skill-card' + (index === data.skillGroups.length-1 ? ' predictive-card' : ''));
      const header = element('div', null, 'skill-card-heading');
      const number = element('span', String(index+1).padStart(2,'0'), 'skill-index'); number.setAttribute('aria-hidden','true');
      header.append(number,element('h3',group.title));
      const list = element('ul'); list.append(...group.skills.map(skill => element('li',skill)));
      card.append(header,list);return card;
    }));
  }
  if (data.portrait && $('.portrait-frame img')) $('.portrait-frame img').src = data.portrait;
  if ($('#sector-list')) $('#sector-list').replaceChildren(...data.sectors.map(sector => {
    const row = element('article', null, 'sector-row');
    const icon = element('img', null, 'sector-icon'); icon.src = 'assets/' + sector.icon + '.svg'; icon.alt = ''; icon.width = 32; icon.height = 32; row.append(icon, element('h3', sector.name), element('p', sector.description));
    return row;
  }));
  if ($('#year')) $('#year').textContent = new Date().getFullYear();
  if (data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) && $('#email-link')) {
    $('#email-link').href = 'mailto:' + data.email;
    $('#email-link').hidden = false;
  }
  if (safeUrl(data.resume, true) && $('#resume-link')) {
    $('#resume-link').href = safeUrl(data.resume, true);
    document.querySelectorAll('[data-resume-download], [data-resume-view]').forEach(node => {node.href = safeUrl(data.resume, true); node.hidden = false;});
    $('#resume-link').hidden = false; if ($('#resume')) $('#resume').hidden = false; document.querySelectorAll('[data-resume-nav]').forEach(n => { n.hidden = false; });
  }
  const projects = (data.projects || []).filter(p => p.published === true && /^[a-z0-9-]+$/.test(p.slug) && p.title && p.question && p.contribution && p.methodology && p.findings && p.assumptions && p.limitations);
  if ($('#project-list') && projects.length) {
    $('#projects').hidden = false;
    document.querySelectorAll('[data-project-nav]').forEach(n => {n.hidden = false;});
    $('#project-list').replaceChildren(...projects.map(project => {
      const card = element('article', null, 'project-card');
      card.append(element('p', project.sector || '', 'eyebrow'), element('h3', project.title), element('p', project.question));
      const action = element('a', 'Read case study →', 'text-link');
      action.href = 'project.html?id=' + encodeURIComponent(project.slug);
      card.append(action);
      return card;
    }));
    const heroAction = $('.hero-actions .primary');
    if (heroAction) {heroAction.href = '#projects'; heroAction.textContent = 'Explore my work ↓';}
  }
  const caseRoot = $('#case-content');
  if (caseRoot) {
    const project = projects.find(p => p.slug === new URLSearchParams(location.search).get('id'));
    if (!project) return;
    document.title = project.title + ' | ' + data.name;
    $('meta[name="description"]').content = project.question;
    const heading = element('h1', project.title);
    const meta = element('p', [project.sector, project.period, project.analysisDate && 'Analysis date: ' + project.analysisDate].filter(Boolean).join(' · '), 'muted');
    caseRoot.replaceChildren(element('p', 'PROJECT CASE STUDY', 'eyebrow'), heading, meta);
    if (safeUrl(project.image, true)) {
      const img = element('img'); img.src = safeUrl(project.image, true); img.alt = project.imageAlt || project.title; img.loading = 'lazy'; caseRoot.append(img);
    }
    for (const [key, label] of [['question','Business question'], ['contribution','My contribution'], ['methodology','Methodology'], ['assumptions','Key assumptions'], ['findings','Findings & implications'], ['limitations','Risks & limitations']]) {
      caseRoot.append(element('h2', label), element('p', project[key]));
    }
    const actions = element('div', null, 'contact-actions');
    for (const [key, label] of [['repository','Repository ↗'], ['report','Research report ↗'], ['model','Financial model ↗'], ['dashboard','Dashboard ↗']]) {
      const action = link(label, project[key], key !== 'repository'); if (action) actions.append(action);
    }
    if (actions.childElementCount) caseRoot.append(element('h2', 'Explore the work'), actions);
  }
})();
/* Expanded portfolio sections and progressive interactions. */
(() => {
  const d = window.PORTFOLIO;
  if (!d || !document.querySelector('#home')) return;
  const $ = selector => document.querySelector(selector);
  const paragraph = text => {const p = document.createElement('p'); p.textContent = text; return p;};
  const setText = (selector, text) => document.querySelectorAll(selector).forEach(n => {n.textContent = text;});
  setText('[data-tagline]', d.tagline);
  setText('[data-secondary-sectors]', d.secondarySectors);
  $('#about-story').replaceChildren(...d.aboutParagraphs.map(paragraph));
  $('#focus-areas').replaceChildren(...d.focusAreas.map(text => {const li = document.createElement('li'); li.textContent = text; return li;}));
  const email = $('#public-email'); email.querySelector('.contact-value').textContent = d.email; email.href = 'mailto:' + d.email;
  const phone = $('#public-phone'); phone.querySelector('.contact-value').textContent = d.phone; phone.href = 'tel:' + d.phone.replace(/[^+\d]/g,'');
  const template = $('#experience-list .experience-item').cloneNode(true);
  const updateCertificate = (container, source, title, landscape) => {
    const card = container.querySelector('.certificate-card');
    card.classList.toggle('landscape',landscape);
    const anchor = card.querySelector('a');
    anchor.href = source; anchor.dataset.title = title; anchor.setAttribute('aria-label','Enlarge ' + title);
    const image = card.querySelector('img'); image.src = source; image.alt = title;
    image.width = 900; image.height = landscape ? 640 : 1300;
    const caption = card.querySelector('figcaption');
    caption.replaceChildren(Object.assign(document.createElement('span'),{className:'certificate-dot'}),document.createTextNode(title));
  };
  $('#experience-list').replaceChildren(...d.experience.map(item => {
    const card = template.cloneNode(true); card.id = item.id;
    card.querySelector('.eyebrow').textContent = item.dates;
    card.querySelector('h3').textContent = item.company;
    card.querySelector('.experience-role').textContent = item.role;
    card.querySelector('.experience-location').textContent = item.location;
    card.querySelector('h4').textContent = item.headline;
    const story = card.querySelector('.story');
    story.replaceChildren(...item.paragraphs.map(paragraph));
    card.querySelector('.company-groups')?.remove();
    if (item.companyGroups?.length) {
      const groups = document.createElement('section'); groups.className = 'company-groups';
      const title = document.createElement('h4'); title.textContent = 'Companies I analysed'; groups.append(title);
      item.companyGroups.forEach(group => {
        const row = document.createElement('div'); row.className = 'company-group';
        const label = document.createElement('h5'); label.textContent = group.label;
        const list = document.createElement('ul');
        group.companies.forEach(name => {const li = document.createElement('li');li.textContent=name;list.append(li);});
        row.append(label,list);groups.append(row);
      });
      story.after(groups);
    }
    updateCertificate(card,item.certificate,item.company + ': internship certificate',item.id === 'idea');
    return card;
  }));
  const g = d.globalExposure;
  $('#global-story').replaceChildren(Object.assign(document.createElement('h3'),{textContent:g.title}),...g.paragraphs.map(paragraph));
  $('.global-subtitle').textContent = g.subtitle;
  $('.programme-meta').replaceChildren(...[g.programme,g.institution,g.dates].flatMap((text,index) => index ? [document.createElement('br'),document.createTextNode(text)] : [document.createTextNode(text)]));
  updateCertificate($('.global-proof'),g.certificate,'Sunway University: certificate of participation',true);
  $('.global-proof > a').href = g.pdf;
  const menuButton = $('.menu-toggle');
  menuButton.hidden = false; document.documentElement.classList.add('js');
  const closeMenu = () => {menuButton.setAttribute('aria-expanded','false'); $('#nav-links').classList.remove('is-open');};
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded',String(open)); $('#nav-links').classList.toggle('is-open',open);
  });
  $('#nav-links').addEventListener('click', event => {if (event.target.closest('a')) closeMenu();});
  document.addEventListener('keydown', event => {if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {closeMenu();menuButton.focus();}});
  const viewport = matchMedia('(max-width: 900px)'); viewport.addEventListener('change',closeMenu);
  const dialog = $('#certificate-dialog');
  let opener;
  if (dialog && typeof dialog.showModal === 'function') {
    document.addEventListener('click', event => {
      const anchor = event.target.closest('[data-certificate]');
      if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); opener = anchor;
      $('#certificate-dialog-title').textContent = anchor.dataset.title;
      $('#certificate-full').src = anchor.href; $('#certificate-full').alt = anchor.dataset.title;
      dialog.showModal(); document.documentElement.classList.add('viewer-open'); $('#certificate-close').focus();
    });
    $('#certificate-close').addEventListener('click',() => dialog.close());
    dialog.addEventListener('click',event => {if(event.target === dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close();}});
    dialog.addEventListener('close',() => {document.documentElement.classList.remove('viewer-open');if(opener)opener.focus();});
  }
})();
