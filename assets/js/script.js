document.addEventListener('DOMContentLoaded', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        splide.mount();
        projectCarousels.set(panel, splide);
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
        new Splide('#initiativeSplide', {
            perPage: 3,
            gap: '2.5rem',
            pagination: false,
            speed: reduceMotion ? 0 : 450,
            breakpoints: {
                900: { perPage: 2 },
                560: { perPage: 1 },
            },
        }).mount();
    }

    /* ---------- art archive: filter + lightbox ---------- */
    const artRoot = document.getElementById('artSplide');
    const artList = artRoot.querySelector('.splide__list');
    const allArt = Array.from(artList.children).map((li) => li.cloneNode(true));
    const caption = document.getElementById('artCaption');
    const filterButtons = document.querySelectorAll('.filter');

    const captions = {
        all: 'Favorite pieces across drawing, motion, and graphic design.',
        misc: 'Drawings, animation, and VR from my art and IMD coursework at UMD.',
        touchdesigner: 'Interactive visuals and motion studies built in TouchDesigner.',
        graphics: 'Event graphics and branding for the Association of Women in Computing.',
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
            const wrap = document.createElement('div');
            wrap.className = 'yt';
            const f = document.createElement('iframe');
            f.src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
            f.title = title || 'Video';
            f.allow = 'autoplay; encrypted-media; picture-in-picture';
            f.allowFullscreen = true;
            wrap.append(f);
            dialogBody.append(wrap);
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
});