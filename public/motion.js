/* ============================================================================
   motion.js: site-wide motion layer
   Served statically from /public, loaded with `defer` by index.astro and
   src/layouts/Layout.astro. Every module below is a no-op when its markup is
   absent, so the same file drives the homepage and the article pages.

   Pairs with the "04. MOTION SYSTEM" block in Style.css: REVEAL below must
   stay in sync with the selector list there.
   ========================================================================= */
(function () {
    'use strict';

    var reduced = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Scroll reveal ───────────────────────────────────────────────────── */
    var REVEAL = [
        '.section-label', '.section-intro',
        '.intro-text p', '.intro-links', '.intro-image-wrap',
        '.cd-label', '.cd-display', '.cd-deadline', '.cd-goal',
        '.award',
        '.stat-block-head', '.stat-figure', '.contrib', '.lc-donut-figure', '.repo-list', '.stats-latest',
        '.stack-group',
        '.project-card',
        '.story-disclaimer',
        '.story-chapter', '.chapter-header', '.entry', '.entry-pull', '.entry-wide',
        '.timeline-item', '.timeline-end',
        '.next-paragraph', '.next-contact', '.contact-card',
        '.faq-item',
        '.bio-lede', '.bio-figure', '.bio-table-wrap', '.bio-links', '.breadcrumb',
        '.age', '.bio-panel',
        '.issue-masthead', '.issue-cover', '.issue-figure', '.issue-card', '.subscribe',
        '.devlog-entry',
        '.rule'
    ].join(',');

    function initReveal() {
        // Hairline rules animate an inner span so the border can scale.
        var rules = document.querySelectorAll('.rule');
        for (var r = 0; r < rules.length; r++) {
            if (!rules[r].firstElementChild) {
                rules[r].appendChild(document.createElement('span'));
            }
        }

        var targets = document.querySelectorAll(REVEAL);
        if (!targets.length) return;

        if (reduced || !('IntersectionObserver' in window)) {
            for (var i = 0; i < targets.length; i++) targets[i].classList.add('is-in');
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            // Everything arriving in the same frame is staggered against itself,
            // so a row of cards cascades but a lone item never waits.
            var step = 0;
            for (var j = 0; j < entries.length; j++) {
                if (!entries[j].isIntersecting) continue;
                var el = entries[j].target;
                el.style.setProperty('--d', Math.min(step, 5) * 80 + 'ms');
                el.classList.add('is-in');
                io.unobserve(el);
                step++;
            }
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

        for (var k = 0; k < targets.length; k++) io.observe(targets[k]);
    }

    /* ── Nav: condenses on scroll, retracts downward, returns upward ─────── */
    function initNav() {
        var nav = document.querySelector('.nav');
        if (!nav) return;

        var last = window.pageYOffset || 0;
        var queued = false;

        function update() {
            var y = Math.max(0, window.pageYOffset || 0);

            if (y > 24) nav.classList.add('is-scrolled');
            else nav.classList.remove('is-scrolled');

            if (!reduced) {
                if (y > last + 6 && y > 260) nav.classList.add('is-hidden');
                else if (y < last - 6) nav.classList.remove('is-hidden');
            }

            last = y;
            queued = false;
        }

        window.addEventListener('scroll', function () {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    /* ── Reading-progress hairline ───────────────────────────────────────── */
    function initProgress() {
        if (reduced) return;

        var bar = document.createElement('div');
        bar.className = 'scroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        var fill = document.createElement('span');
        bar.appendChild(fill);
        document.body.appendChild(bar);

        var queued = false;

        function update() {
            var doc = document.documentElement;
            var max = doc.scrollHeight - doc.clientHeight;
            var p = max > 0 ? Math.min(1, (window.pageYOffset || 0) / max) : 0;
            fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
            queued = false;
        }

        window.addEventListener('scroll', function () {
            if (queued) return;
            queued = true;
            window.requestAnimationFrame(update);
        }, { passive: true });

        window.addEventListener('resize', update, { passive: true });
        update();
    }

    /* ── Countdown ───────────────────────────────────────────────────────── */
    function retick(el) {
        el.classList.remove('is-tick');
        void el.offsetWidth;               // force reflow so the keyframe restarts
        el.classList.add('is-tick');
    }

    function initCountdown() {
        var section = document.querySelector('.cd-section');
        if (!section) return;

        var units = {
            days: document.getElementById('cd-days'),
            hours: document.getElementById('cd-hours'),
            mins: document.getElementById('cd-mins'),
            secs: document.getElementById('cd-secs')
        };
        if (!units.days) return;

        var end = new Date(section.getAttribute('data-deadline') || '');
        if (isNaN(end.getTime())) return;

        function put(el, value) {
            if (!el || el.textContent === value) return;
            el.textContent = value;
            if (!reduced) retick(el);
        }

        function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

        // Assigned below. tick() only reaches it once the deadline has passed,
        // by which point tickWhileVisible has returned.
        var halt = null;

        function tick() {
            var diff = end.getTime() - Date.now();

            if (diff <= 0) {
                // Past the deadline the clock settles on zero rather than "--".
                put(units.days, '0');
                put(units.hours, '00');
                put(units.mins, '00');
                put(units.secs, '00');
                section.classList.add('is-complete');
                if (halt) halt();
                return;
            }

            put(units.days, String(Math.floor(diff / 86400000)));
            put(units.hours, pad(Math.floor((diff % 86400000) / 3600000)));
            put(units.mins, pad(Math.floor((diff % 3600000) / 60000)));
            put(units.secs, pad(Math.floor((diff % 60000) / 1000)));
        }

        halt = tickWhileVisible(section, tick);
    }

    /* ── Age count-up ────────────────────────────────────────────────────── */

    /* Whole calendar days between two dates, ignoring clock time. Doing this by
       millisecond division drifts by an hour across a DST boundary, which is
       enough to show the wrong day count for half the year. */
    function calendarDays(from, to) {
        var a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
        var b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
        return Math.round((b - a) / 86400000);
    }

    function secondsIntoDay(d) {
        return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }

    function ageParts(birth, now) {
        // Most recent birthday on or before `now`.
        var years = now.getFullYear() - birth.getFullYear();
        var mark = new Date(birth.getTime());
        mark.setFullYear(birth.getFullYear() + years);
        if (mark.getTime() > now.getTime()) {
            years -= 1;
            mark = new Date(birth.getTime());
            mark.setFullYear(birth.getFullYear() + years);
        }

        var days = calendarDays(mark, now);
        var delta = secondsIntoDay(now) - secondsIntoDay(birth);
        if (delta < 0) { delta += 86400; days -= 1; }

        return {
            years: years,
            days: days,
            hours: Math.floor(delta / 3600),
            mins: Math.floor((delta % 3600) / 60),
            secs: delta % 60
        };
    }

    function initAgeCount() {
        var section = document.querySelector('.age');
        if (!section) return;

        var birth = new Date(section.getAttribute('data-birth') || '');
        if (isNaN(birth.getTime())) return;

        var units = {
            years: document.getElementById('age-years'),
            days: document.getElementById('age-days'),
            hours: document.getElementById('age-hours'),
            mins: document.getElementById('age-mins'),
            secs: document.getElementById('age-secs')
        };
        if (!units.years) return;

        function put(el, value) {
            if (!el || el.textContent === value) return;
            el.textContent = value;
            if (!reduced) retick(el);
        }

        function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

        function tick() {
            var a = ageParts(birth, new Date());
            put(units.years, String(a.years));
            put(units.days, String(a.days));
            put(units.hours, pad(a.hours));
            put(units.mins, pad(a.mins));
            put(units.secs, pad(a.secs));
        }

        tickWhileVisible(section, tick);
    }

    /* ── Life in weeks ───────────────────────────────────────────────────── */

    /* The grid is rendered complete and correct at build time, so it is right
       for no-JS visitors and right the moment the page paints. This only
       reconciles the drift since the last deploy, touching the handful of cells
       that changed rather than walking all 4,680. */
    function initLifeGrid() {
        var grid = document.querySelector('.life-grid');
        if (!grid) return;

        var birth = new Date(grid.getAttribute('data-birth') || '');
        if (isNaN(birth.getTime())) return;

        // Cells are nested one level inside .life-row, so this is a flat query
        // rather than grid.children. Run once; the loop below touches only the
        // handful of cells that changed.
        var cells = grid.querySelectorAll('.life-row > i');
        var total = cells.length;
        if (!total) return;

        var built = parseInt(grid.getAttribute('data-lived'), 10);
        if (isNaN(built)) built = 0;

        // Whole calendar days, matching milestoneWeek() in milestones.ts. A
        // millisecond division drifts by the DST hour and can hand back a
        // different week than the build did, which would move the "this week"
        // square on load.
        var today = new Date();
        var days = Math.round(
            (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
                - Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate())) / 86400000);

        var lived = Math.floor(days / 7);
        if (lived < 0) lived = 0;
        if (lived > total) lived = total;

        // Event colouring is baked in at build time and must survive a restate,
        // so only the lived/now state is rewritten.
        function setState(cell, state) {
            cell.classList.remove('is-lived', 'is-now');
            if (state) cell.classList.add(state);
        }

        if (lived !== built) {
            var i;
            if (lived > built) {
                for (i = built; i < lived; i++) setState(cells[i], 'is-lived');
            } else {
                for (i = lived; i < built; i++) setState(cells[i], '');
            }
            if (cells[lived]) setState(cells[lived], 'is-now');
            grid.setAttribute('data-lived', String(lived));
        }

        var pct = (lived / total * 100).toFixed(1);
        grid.setAttribute('aria-label',
            'Life in weeks: ' + lived + ' of ' + total + ' weeks lived, ' + pct + ' per cent.');

        var count = document.getElementById('life-count');
        if (count) count.textContent = lived.toLocaleString();
        var percent = document.getElementById('life-percent');
        if (percent) percent.textContent = pct + '%';

        initGridTitles(grid, cells, birth);
    }

    /* Every square gets a hover label, but not from the build. A title on all
       4,680 is around 145 KB of raw HTML, which is the same cost LifeGrid.astro
       already refuses to pay for its styles. The ~45 marked cells keep the
       title they were rendered with, since their text carries meaning; the rest
       are labelled the first time the pointer reaches them and then left alone.

       Delegated to the grid, so this is one listener rather than 4,680. */
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    function initGridTitles(grid, cells, birth) {
        var start = Date.UTC(birth.getFullYear(), birth.getMonth(), birth.getDate());

        // "Week 2 of July 2026". A grid week can straddle two months, so the
        // month is the one it starts in; week starts are seven days apart, so
        // dividing the day of the month by seven gives the ordinal inside it.
        function label(i) {
            var d = new Date(start + i * 604800000);
            return 'Week ' + (Math.floor((d.getUTCDate() - 1) / 7) + 1)
                + ' of ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
        }

        grid.addEventListener('mouseover', function (e) {
            var cell = e.target;
            if (!cell || cell.tagName !== 'I' || cell.hasAttribute('title')) return;
            var i = Array.prototype.indexOf.call(cells, cell);
            if (i >= 0) cell.setAttribute('title', label(i));
        });
    }

    /* ── Shared ──────────────────────────────────────────────────────────── */

    /* Both clocks call retick(), which forces a synchronous reflow. Doing that
       once a second forever, scrolled out of view, or in a background tab, is
       pure main-thread cost and shows up as INP. So a clock only runs while it
       is actually on screen. Returns a function that stops it for good. */
    function tickWhileVisible(section, onTick) {
        var timer = null;

        function begin() {
            if (timer) return;
            timer = setInterval(onTick, 1000);
            onTick();
        }

        function halt() {
            if (!timer) return;
            clearInterval(timer);
            timer = null;
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                if (entries[entries.length - 1].isIntersecting) begin();
                else halt();
            }, { threshold: 0 }).observe(section);
        } else {
            begin();
        }

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) halt();
            else if (section.getBoundingClientRect().top < window.innerHeight) begin();
        });

        onTick();   // paint real values immediately, before the observer fires
        return halt;
    }

    /* ── Project gallery and the full-screen viewer ──────────────────────────
       Two behaviours over markup that already works without either.

       The card slideshow is radios and labels, so the dots work with no
       JavaScript at all. This adds the arrows, which are in the markup but
       hidden and tabindex="-1" until it runs, because three controls that do
       nothing are worse than three controls that are not there.

       The viewer is one <dialog>, built once on first open. <dialog> rather
       than a div: showModal() gives a focus trap, Escape, inertness of the
       page behind it and a ::backdrop, all of which would otherwise be a
       few hundred lines of getting it subtly wrong.

       The slide list is FLAT across every project, so the arrows keep going
       past the end of one project into the next and the title changes with
       them. That is what "scroll to other projects too" means, and it is why
       the list is built once from the whole page rather than per card.

       Everything is read out of the DOM the cards already render. No data is
       duplicated into a script tag, which also means nothing to keep in sync
       and nothing new for the CSP to allow. */
    function initProjectGallery() {
        var shots = document.querySelectorAll('.project-shot');
        if (!shots.length) return;

        /* Flat, in page order: [{ project, src, alt }, ...]. Card index is
           recorded so opening from a card lands on the right slide. */
        var slides = [];
        var cardStart = [];

        for (var s = 0; s < shots.length; s++) {
            var shot = shots[s];
            var imgs = shot.querySelectorAll('.project-slides img');
            if (!imgs.length) continue;

            var card = shot.closest('.project-card');
            var name = card ? (card.querySelector('.project-name') || {}).textContent : '';
            cardStart.push({ shot: shot, from: slides.length });

            for (var i = 0; i < imgs.length; i++) {
                slides.push({
                    project: (name || '').trim(),
                    // The 1600px variant the card put on the element. Falls
                    // back to what is displayed if it is ever missing.
                    src: imgs[i].getAttribute('data-full') || imgs[i].currentSrc || imgs[i].src,
                    alt: imgs[i].getAttribute('alt') || ''
                });
            }
        }
        if (!slides.length) return;

        /* ── Card arrows ─────────────────────────────────────────────────── */
        for (var c = 0; c < cardStart.length; c++) {
            (function (shot) {
                var inputs = shot.querySelectorAll('.project-slide-input');
                if (inputs.length < 2) return;

                var arrows = shot.querySelector('.project-arrows');
                if (arrows) {
                    arrows.removeAttribute('aria-hidden');
                    var btns = arrows.querySelectorAll('.project-arrow');
                    for (var b = 0; b < btns.length; b++) {
                        btns[b].removeAttribute('tabindex');
                        (function (btn) {
                            btn.addEventListener('click', function () {
                                var at = 0;
                                for (var k = 0; k < inputs.length; k++) if (inputs[k].checked) at = k;
                                // Wraps, so the arrows never dead-end on a
                                // four-slide gallery.
                                var next = (at + Number(btn.getAttribute('data-dir')) + inputs.length)
                                    % inputs.length;
                                inputs[next].checked = true;
                            });
                        })(btns[b]);
                    }
                }
            })(cardStart[c].shot);
        }

        /* ── The viewer ──────────────────────────────────────────────────── */
        var dialog = null;
        var imgEl = null;
        var titleEl = null;
        var countEl = null;
        var at = 0;

        function render() {
            var slide = slides[at];
            imgEl.src = slide.src;
            imgEl.alt = slide.alt;
            titleEl.textContent = slide.project;
            countEl.textContent = (at + 1) + ' / ' + slides.length;
        }

        function move(step) {
            at = (at + step + slides.length) % slides.length;
            render();
        }

        function build() {
            dialog = document.createElement('dialog');
            dialog.className = 'shot-viewer';

            dialog.innerHTML =
                '<div class="shot-viewer-bar">'
                + '<p class="shot-viewer-title"></p>'
                + '<p class="shot-viewer-count"></p>'
                + '<button class="shot-viewer-close" type="button" aria-label="Close">'
                + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                + ' stroke-width="2" stroke-linecap="round" aria-hidden="true">'
                + '<path d="M5 5l14 14M19 5L5 19"/></svg></button>'
                + '</div>'
                + '<div class="shot-viewer-stage">'
                + '<button class="shot-viewer-arrow is-prev" type="button" aria-label="Previous screenshot">'
                + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                + '<path d="M15 5 8 12l7 7"/></svg></button>'
                + '<img class="shot-viewer-img" alt="">'
                + '<button class="shot-viewer-arrow is-next" type="button" aria-label="Next screenshot">'
                + '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
                + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
                + '<path d="M9 5l7 7-7 7"/></svg></button>'
                + '</div>';

            document.body.appendChild(dialog);
            imgEl = dialog.querySelector('.shot-viewer-img');
            titleEl = dialog.querySelector('.shot-viewer-title');
            countEl = dialog.querySelector('.shot-viewer-count');

            dialog.querySelector('.is-prev').addEventListener('click', function () { move(-1); });
            dialog.querySelector('.is-next').addEventListener('click', function () { move(1); });
            dialog.querySelector('.shot-viewer-close').addEventListener('click', function () {
                dialog.close();
            });

            dialog.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight') { move(1); e.preventDefault(); }
                else if (e.key === 'ArrowLeft') { move(-1); e.preventDefault(); }
            });

            /* Clicking the backdrop closes. The <dialog> element IS the
               backdrop as far as the event target goes, so a click that lands
               on the dialog itself rather than on any child is a backdrop
               click. */
            dialog.addEventListener('click', function (e) {
                if (e.target === dialog) dialog.close();
            });
        }

        function open(index) {
            if (!dialog) build();
            at = index;
            render();
            dialog.showModal();
        }

        /* Opening: the expand button, and a click anywhere on the picture. The
           button is what makes it reachable by keyboard; the picture click is
           the thing everyone tries first. */
        for (var e2 = 0; e2 < cardStart.length; e2++) {
            (function (entry) {
                var shot = entry.shot;
                var inputs = shot.querySelectorAll('.project-slide-input');

                function currentIndex() {
                    var offset = 0;
                    for (var k = 0; k < inputs.length; k++) if (inputs[k].checked) offset = k;
                    return entry.from + offset;
                }

                var expand = shot.querySelector('.project-expand');
                if (expand) {
                    expand.classList.add('is-ready');
                    expand.addEventListener('click', function () { open(currentIndex()); });
                }

                var stage = shot.querySelector('.project-slides');
                if (stage) {
                    stage.addEventListener('click', function () { open(currentIndex()); });
                    stage.classList.add('is-zoomable');
                }
            })(cardStart[e2]);
        }
    }

    /* ── Skip controls ──────────────────────────────────────────────────────
       The story and the timeline are the two long sections on the page, so
       each gets a way out. One implementation, driven by data-skip-watch on
       the button: the section it names is what the observer follows, and the
       href is where it jumps. Adding a third is markup only.

       The button is only shown while its section is the thing being read.
       Fixed and permanent they would be black pills floating over every other
       section, and past the last row there is nothing left to skip.

       The margins are deliberately asymmetric. -35% on top means the button
       waits until the section is genuinely underway rather than appearing the
       instant its first pixel crosses the fold, and -15% on the bottom retires
       it slightly before the end, where offering to skip is just noise. */
    function initSkipJumps() {
        var btns = document.querySelectorAll('.skip-jump[data-skip-watch]');
        if (!btns.length) return;

        for (var i = 0; i < btns.length; i++) {
            (function (btn) {
                var target = document.querySelector(btn.getAttribute('data-skip-watch'));
                if (!target) return;

                if (!('IntersectionObserver' in window)) {
                    btn.classList.add('is-visible');
                    return;
                }

                new IntersectionObserver(function (entries) {
                    var showing = entries[entries.length - 1].isIntersecting;
                    btn.classList.toggle('is-visible', showing);
                }, { rootMargin: '-35% 0px -15% 0px', threshold: 0 }).observe(target);
            })(btns[i]);
        }
    }

    function start() {
        initReveal();
        initNav();
        initProgress();
        initProjectGallery();
        initSkipJumps();
        initCountdown();
        initAgeCount();
        initLifeGrid();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
