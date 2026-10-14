document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Every mounted carousel, keyed by its root element (used for hover + arrow keys)
    const splideByRoot = new Map();
    const hasSplide = typeof Splide !== 'undefined';

    /* ---------- mobile nav ---------- */
    const toggle = document.querySelector('.nav__toggle');
    const links = document.getElementById('navLinks');

    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            links.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });

    /* ---------- project carousels ----------
       A carousel inside a hidden tab can't measure itself, so each one
       mounts the first time its tab is shown. */
    const projectCarousels = new Map();

    function mountProjects(panel) {
        if (!hasSplide || projectCarousels.has(panel)) return;
        const el = panel.querySelector('.project-splide');
        const splide = new Splide(el, {
            type: 'slide',
            perPage: 1,
            gap: '1.5rem',
            speed: reduceMotion ? 0 : 450,
            pagination: true,
            arrows: true,
        });
        // Size the track to the active slide so shorter cards don't leave empty space
        const fitHeight = () => {
            const active = splide.Components.Slides.getAt(splide.index);
            if (active) splide.Components.Elements.track.style.height = active.slide.offsetHeight + 'px';
        };
        splide.on('mounted move resized', fitHeight);
        splide.mount();
        window.addEventListener('load', fitHeight);
        // Images and videos keep their natural size, so refit once each one has loaded
        el.querySelectorAll('img').forEach((m) => m.addEventListener('load', fitHeight));
        el.querySelectorAll('video').forEach((m) => m.addEventListener('loadedmetadata', fitHeight));
        projectCarousels.set(panel, splide);
        splideByRoot.set(el, splide);
    }

    /* ---------- tabs ---------- */
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

    function selectTab(tab) {
        tabs.forEach((t) => {
            const selected = t === tab;
            t.setAttribute('aria-selected', String(selected));
            t.tabIndex = selected ? 0 : -1;
            document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
        });
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        mountProjects(panel);
        projectCarousels.get(panel)?.refresh();
        projectCarousels.get(panel)?.emit('resized');
    }

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            next.focus();
            selectTab(next);
        });
    });

    mountProjects(document.getElementById('panel-research'));

    /* ---------- initiatives carousel ---------- */
    if (hasSplide) {
        const initiativeSplide = new Splide('#initiativeSplide', {
            perPage: 3,
            gap: '2.5rem',
            pagination: false,
            speed: reduceMotion ? 0 : 450,
            breakpoints: {
                900: { perPage: 2 },
                560: { perPage: 1 },
            },
        }).mount();
        splideByRoot.set(document.getElementById('initiativeSplide'), initiativeSplide);
    }

    /* ---------- art archive: filter + lightbox ---------- */
    const artRoot = document.getElementById('artSplide');
    const artList = artRoot.querySelector('.splide__list');
    const allArt = Array.from(artList.children).map((li) => li.cloneNode(true));
    const caption = document.getElementById('artCaption');
    const filterButtons = document.querySelectorAll('.filter');

    const captions = {
        all: 'Fun pieces across drawing, motion, and graphic design.',
        misc: 'Drawings and VR from my art and IMD degree at UMD.',
        touchdesigner: 'Interactive visuals and motion studies built in TouchDesigner.',
        graphics: 'Event graphics for the Association for Women in Computing.',
    };

    let artSplide;

    function renderArt(filter) {
        if (artSplide) artSplide.destroy(true);
        artList.replaceChildren(
            ...allArt
                .filter((li) => filter === 'all' || li.dataset.category === filter)
                .map((li) => li.cloneNode(true))
        );
        if (reduceMotion) {
            artList.querySelectorAll('video').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });
        }
        caption.textContent = captions[filter] || captions.all;

        if (!hasSplide) return;
        artSplide = new Splide(artRoot, {
            perPage: 3,
            perMove: 1,
            gap: '1.25rem',
            pagination: false,
            rewind: true,
            speed: reduceMotion ? 0 : 450,
            breakpoints: {
                900: { perPage: 2 },
                560: { perPage: 1 },
            },
        });
        artSplide.mount();
        splideByRoot.set(artRoot, artSplide);
    }

    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            renderArt(btn.dataset.filter);
        });
    });

    renderArt('all');

    const dialog = document.getElementById('artDialog');
    const dialogTitle = document.getElementById('artDialogTitle');
    const dialogBody = document.getElementById('artDialogBody');

    // YouTube player for the lightbox, with a fallback link in case embedding is blocked
    function youtubeEmbed(id, title) {
        const frag = document.createDocumentFragment();
        const wrap = document.createElement('div');
        wrap.className = 'yt';
        const f = document.createElement('iframe');
        f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
        f.title = title || 'Video';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        wrap.append(f);
        const fallback = document.createElement('a');
        fallback.className = 'lightbox__fallback';
        fallback.href = `https://www.youtube.com/watch?v=${id}`;
        fallback.target = '_blank';
        fallback.rel = 'noopener';
        fallback.textContent = 'Video not playing? Watch on YouTube';
        frag.append(wrap, fallback);
        return frag;
    }

    // One listener on the list survives re-renders from filtering.
    artList.addEventListener('click', (e) => {
        const tile = e.target.closest('.art-tile');
        if (!tile) return;

        const { type, src, title, youtubeId } = tile.dataset;
        dialogTitle.textContent = title || '';
        dialogBody.replaceChildren();

        if (type === 'video') {
            const v = document.createElement('video');
            Object.assign(v, { src, controls: true, autoplay: true, muted: true, loop: true, playsInline: true });
            dialogBody.append(v);
        } else if (type === 'youtube') {
            dialogBody.append(youtubeEmbed(youtubeId, title));
        } else {
            const img = document.createElement('img');
            img.src = src;
            img.alt = title || '';
            dialogBody.append(img);
        }
        dialog.showModal();
    });

    dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => dialogBody.replaceChildren()); // stops video/audio

    /* ---------- work cards: YouTube thumbnails play in the lightbox ---------- */
    document.querySelectorAll('.project__media a.video-thumb').forEach((link) => {
        const match = link.href.match(/[?&]v=([\w-]{6,})/) || link.href.match(/youtu\.be\/([\w-]{6,})/);
        if (!match) return;
        const title = (link.querySelector('img')?.alt || 'Video').replace(/,? video thumbnail$/i, '');
        link.addEventListener('click', (e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let modified clicks open YouTube in a new tab
            e.preventDefault();
            dialogTitle.textContent = title;
            dialogBody.replaceChildren(youtubeEmbed(match[1], title));
            dialog.showModal();
        });
    });

    /* ---------- work cards: click an image or video to expand it ---------- */
    document.querySelectorAll('.project__media > img, .project__media > video').forEach((media) => {
        const label = media.getAttribute('alt') || media.getAttribute('aria-label') || 'Project media';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'media-zoom';
        btn.setAttribute('aria-label', `Expand: ${label}`);
        media.replaceWith(btn);
        btn.append(media);
        const hint = document.createElement('span');
        hint.className = 'media-zoom__hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = 'Expand';
        btn.append(hint);

        btn.addEventListener('click', () => {
            dialogTitle.textContent = label;
            dialogBody.replaceChildren();
            if (media.tagName === 'VIDEO') {
                const v = document.createElement('video');
                v.controls = true; v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
                media.querySelectorAll('source').forEach((src) => v.append(src.cloneNode()));
                if (media.getAttribute('src')) v.src = media.getAttribute('src');
                dialogBody.append(v);
            } else {
                const img = document.createElement('img');
                img.src = media.currentSrc || media.src;
                img.alt = media.alt || '';
                dialogBody.append(img);
            }
            dialog.showModal();
        });
    });

    /* ---------- arrow keys move whichever carousel the pointer is over ---------- */
    let hoveredSplide = null;
    document.querySelectorAll('.splide').forEach((root) => {
        root.addEventListener('mouseenter', () => { hoveredSplide = root; });
        root.addEventListener('mouseleave', () => { if (hoveredSplide === root) hoveredSplide = null; });
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if (!hoveredSplide || dialog.open || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target.closest('input, textarea, select, [contenteditable="true"], [role="tab"]')) return;
        const inst = splideByRoot.get(hoveredSplide);
        if (!inst) return;
        e.preventDefault();
        inst.go(e.key === 'ArrowRight' ? '>' : '<');
    });

    /* ---------- in-page links: land with the section's content just below the header ---------- */
    const header = document.querySelector('.site-header');
    function scrollToSection(section, smooth) {
        const content = section.querySelector('.wrap') || section;
        const y = content.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 32;
        window.scrollTo({ top: Math.max(0, y), behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    }
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const id = link.getAttribute('href').slice(1);
        const section = id && document.getElementById(id);
        if (!section || section.tagName !== 'SECTION') return; // #top, #main etc. keep default behavior
        e.preventDefault();
        history.pushState(null, '', '#' + id);
        scrollToSection(section, true);
    });
    window.addEventListener('load', () => {
        const section = location.hash && document.getElementById(location.hash.slice(1));
        if (section && section.tagName === 'SECTION') scrollToSection(section, false);
    });
});