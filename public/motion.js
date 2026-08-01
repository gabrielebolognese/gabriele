/* ============================================================================
   motion.js — site-wide motion layer
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
        '.project-card',
        '.story-chapter', '.chapter-header', '.entry', '.entry-pull', '.entry-wide',
        '.timeline-item',
        '.article-card',
        '.next-paragraph', '.next-contact',
        '.faq-item',
        '.bio-lede', '.bio-figure', '.bio-table-wrap', '.bio-links', '.breadcrumb',
        '.age', '.bio-panel',
        '.article-cover-img', '.article-h1',
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

    /* ── Carousels ───────────────────────────────────────────────────────── */
    function initCarousels() {
        var roots = document.querySelectorAll('.carousel');

        for (var i = 0; i < roots.length; i++) {
            (function (root) {
                var track = root.querySelector('.carousel-track');
                if (!track) return;                       // single-image gallery

                var imgs = track.querySelectorAll('.carousel-img');
                var total = imgs.length;
                if (!total) return;

                var btns = root.querySelectorAll('.carousel-btn');
                var counter = root.querySelector('.carousel-counter');
                var current = null;

                // The count is derived from the markup, never hardcoded.
                if (counter) {
                    counter.textContent = '';
                    current = document.createElement('span');
                    current.textContent = '1';
                    counter.appendChild(current);
                    counter.appendChild(document.createTextNode(' / ' + total));
                }

                var index = 0;
                track.classList.add('is-ready');

                function show(next) {
                    index = (next + total) % total;
                    track.style.transform = 'translate3d(-' + (index * 100) + '%, 0, 0)';

                    for (var n = 0; n < total; n++) {
                        if (n === index) imgs[n].classList.add('is-active');
                        else imgs[n].classList.remove('is-active');
                    }

                    if (current) {
                        current.textContent = String(index + 1);
                        if (!reduced) retick(current);
                    }
                }

                if (btns[0]) btns[0].addEventListener('click', function () { show(index - 1); });
                if (btns[1]) btns[1].addEventListener('click', function () { show(index + 1); });

                root.addEventListener('keydown', function (e) {
                    if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
                    else if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
                });

                // Swipe
                var startX = 0;
                track.addEventListener('touchstart', function (e) {
                    startX = e.touches[0].clientX;
                }, { passive: true });

                track.addEventListener('touchend', function (e) {
                    var dx = e.changedTouches[0].clientX - startX;
                    if (Math.abs(dx) > 44) show(dx < 0 ? index + 1 : index - 1);
                }, { passive: true });

                show(0);
            })(roots[i]);
        }
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

        var cells = grid.children;
        var total = cells.length;
        if (!total) return;

        var built = parseInt(grid.getAttribute('data-lived'), 10);
        if (isNaN(built)) built = 0;

        var lived = Math.floor((Date.now() - birth.getTime()) / 604800000);
        if (lived < 0) lived = 0;
        if (lived > total) lived = total;

        if (lived !== built) {
            var i;
            if (lived > built) {
                for (i = built; i < lived; i++) cells[i].className = 'is-lived';
            } else {
                for (i = lived; i < built; i++) cells[i].className = '';
            }
            if (cells[lived]) cells[lived].className = 'is-now';
            grid.setAttribute('data-lived', String(lived));
        }

        var pct = (lived / total * 100).toFixed(1);
        grid.setAttribute('aria-label',
            'Life in weeks: ' + lived + ' of ' + total + ' weeks lived, ' + pct + ' per cent.');

        var count = document.getElementById('life-count');
        if (count) count.textContent = lived.toLocaleString();
        var percent = document.getElementById('life-percent');
        if (percent) percent.textContent = pct + '%';
    }

    /* ── Shared ──────────────────────────────────────────────────────────── */

    /* Both clocks call retick(), which forces a synchronous reflow. Doing that
       once a second forever — scrolled out of view, or in a background tab — is
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

    function start() {
        initReveal();
        initNav();
        initProgress();
        initCarousels();
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
