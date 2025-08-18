/* Cusmaan Binu Cafaan Secondary School — unified JS
   - Header dropdowns + mobile drawer (with ARIA & Esc support)
   - Hash router + active menu state + anchor handling
   - Timetable builder
   - Form submit handlers (replaces all inline onsubmit)
   - Footer year + optional logo injection
*/
(function (window, document) {
    'use strict';
  
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const $  = (sel, root = document) => root.querySelector(sel);
  
    const SchoolApp = {
      init() {
        this.utils.removeInlineOnsubmit();
        this.header.init();
        this.mobile.init();
        this.router.init();
        this.timetable.init();
        this.forms.init();
        this.utils.updateYear();
        this.utils.injectLogo();
      },
  
      header: {
        init() {
          // Desktop dropdowns with ARIA
          const buttons = $$('.nav .has-dd > button');
          const closeAll = () => {
            $$('.nav > li.open').forEach(li => {
              li.classList.remove('open');
              const b = $('button', li);
              if (b) b.setAttribute('aria-expanded', 'false');
            });
          };
  
          buttons.forEach(btn => {
            // Ensure ARIA attributes exist
            if (!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded', 'false');
  
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              const li = btn.closest('li');
              const isOpen = li.classList.contains('open');
              closeAll();
              if (!isOpen) {
                li.classList.add('open');
                btn.setAttribute('aria-expanded', 'true');
              } else {
                btn.setAttribute('aria-expanded', 'false');
              }
            });
          });
  
          // Click outside to close
          document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav')) closeAll();
          });
  
          // Esc to close any open menu
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAll();
          });
        }
      },
  
      mobile: {
        get els() {
          return {
            drawer: $('#drawer'),
            overlay: $('#overlay'),
            openBtn:  $('#hamburger'),
            closeBtn: $('#closeDrawer')
          };
        },
        open() {
          const { drawer, overlay } = this.els;
          if (!drawer || !overlay) return;
          drawer.classList.add('open');
          overlay.classList.add('show');
          document.body.style.overflow = 'hidden';
        },
        close() {
          const { drawer, overlay } = this.els;
          if (!drawer || !overlay) return;
          drawer.classList.remove('open');
          overlay.classList.remove('show');
          document.body.style.overflow = '';
        },
        init() {
          const { drawer, overlay, openBtn, closeBtn } = this.els;
          if (!drawer || !overlay) return;
  
          openBtn && openBtn.addEventListener('click', () => this.open());
          closeBtn && closeBtn.addEventListener('click', () => this.close());
          overlay.addEventListener('click', () => this.close());
  
          // Mobile sub-accordions
          $$('[data-mtoggle]').forEach(btn => {
            btn.addEventListener('click', () => {
              const id = btn.getAttribute('data-mtoggle');
              const panel = document.getElementById('m-' + id);
              if (panel) panel.classList.toggle('open');
            });
          });
  
          // Close on drawer link click
          drawer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => this.close());
          });
  
          // Esc closes drawer
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('open')) this.close();
          });
  
          // Global in-page nav click: close drawer for hash links
          document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href.startsWith('#/') || href.startsWith('#home-')) this.close();
          });
        }
      },
  
      router: {
        routes: [],
        init() {
          this.routes = $$('[data-route]');
          window.addEventListener('hashchange', () => this.show());
          window.addEventListener('load',       () => this.show());
          this.show(); // initial
        },
        setActiveTop(current) {
          // Clear
          $$('.nav a, .nav button').forEach(n => n.classList.remove('active'));
  
          // Dropdown groups (data-toggle buttons)
          const h = (location.hash || '').replace(/^#\//, '');
          if (h.startsWith('about'))     $('[data-toggle="about"]')?.classList.add('active');
          if (h.startsWith('academics')) $('[data-toggle="academics"]')?.classList.add('active');
          if (h.startsWith('school-life')) $('[data-toggle="school"]')?.classList.add('active');
  
          // Top-level anchors with data-top
          $$('.nav a[data-top]').forEach(a => {
            if (a.dataset.top === current) a.classList.add('active');
          });
  
          if (current === 'enroll') $('.nav a.cta')?.classList.add('active');
        },
        show() {
          let h = location.hash || '#/home';
  
          // Support in-page anchors like #home-principal (show Home, then scroll)
          if (!h.startsWith('#/')) {
            if (h.startsWith('#home-')) {
              const home = $('[data-route="home"]');
              this.routes.forEach(r => r.classList.remove('active'));
              home && home.classList.add('active');
              this.setActiveTop('home');
  
              // ensure drawer is closed
              try { SchoolApp.mobile.close(); } catch (e) {}
  
              // scroll after paint
              requestAnimationFrame(() => {
                const el = $(h);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              });
              return;
            }
            history.replaceState(null, '', '#/home');
            h = '#/home';
          }
  
          const route = h.replace(/^#\//, '');
          const target = $(`[data-route="${route}"]`) || $('[data-route="home"]');
  
          this.routes.forEach(el => el.classList.remove('active'));
          target && target.classList.add('active');
  
          this.setActiveTop((route.split('/')[0] || 'home'));
  
          // Close drawer on navigation
          try { SchoolApp.mobile.close(); } catch (e) {}
  
          // Reset scroll to top
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      },
  
      timetable: {
        initialized: false,
        init() {
          // Works for either copy of the timetable page
          const select = $('#tt-class');
          const wrap   = $('#tt-wrap');
          const tbody  = $('#tt-body');
          if (!select || !wrap || !tbody) return;
  
          if (this.initialized) return;
          this.initialized = true;
  
          const DAYS  = ["Saturday","Sunday","Monday","Tuesday","Wednesday"];
          const TIMES = ["07:30–08:10","08:15–08:55","09:00–09:40","10:00–10:40","10:45–11:25","11:30–12:00"];
  
          const BASE = {
            "Form 1": ["Qur’an","Mathematics","English","Biology","Geography","Islamic"],
            "Form 2": ["Mathematics","Chemistry","Arabic","English","Physics","Islamic"],
            "Form 3": ["Physics","Mathematics","English","Chemistry","Biology","Arabic"],
            "Form 4": ["Mathematics","English","Physics","Chemistry","ICT","Islamic"]
          };
  
          const rot = (arr,k)=>arr.slice(k).concat(arr.slice(0,k));
          const buildSchedule = (label)=>{
            const m = label.match(/^Form\s*(\d)([A-D])$/);
            if(!m) return null;
            const formKey = `Form ${m[1]}`;
            const section = m[2];
            const sOff = {A:0,B:1,C:2,D:3}[section] || 0;
            const base = BASE[formKey] || BASE["Form 1"];
            const perDay = {};
            DAYS.forEach((day, dIdx)=>{ perDay[day] = rot(base, (dIdx + sOff) % base.length); });
            return perDay;
          };
  
          function render(label){
            if(!label){ wrap.style.display='none'; return; }
            const sched = buildSchedule(label);
            if(!sched){ wrap.style.display='none'; return; }
  
            const rows = [];
            for(let r=0; r<TIMES.length; r++){
              if(r===3){ rows.push(`<tr class="break"><td class="time">09:40–10:00</td><td colspan="5">Break</td></tr>`); }
              const t = TIMES[r];
              const cells = DAYS.map(day=>`<td>${sched[day][r] || ""}</td>`).join('');
              rows.push(`<tr><td class="time">${t}</td>${cells}</tr>`);
            }
            tbody.innerHTML = rows.join('');
            wrap.style.display = '';
          }
  
          select.addEventListener('change', (e)=>render(e.target.value));
        }
      },
  
      forms: {
        init() {
          // Delegate submit handling (works even if routes swap in/out)
          document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!(form instanceof HTMLFormElement)) return;
  
            // Newsletter (unique class)
            if (form.classList.contains('newsletter-form')) {
              e.preventDefault();
              alert('Thank you for subscribing!');
              form.reset();
              return false;
            }
  
            // Home page contact form
            if (form.closest('#home-contact')) {
              e.preventDefault();
              alert('Thank you! We will get back to you.');
              return false;
            }
  
            // Home page enroll form
            if (form.closest('#home-enroll')) {
              e.preventDefault();
              alert('Application submitted!');
              return false;
            }
  
            // Contact page
            if (form.closest('[data-route="contact"]')) {
              e.preventDefault();
              alert('Message sent!');
              return false;
            }
  
            // Enroll page
            if (form.closest('[data-route="enroll"]')) {
              e.preventDefault();
              alert('Application submitted!');
              return false;
            }
  
            // Fallback: do nothing special
            return true;
          }, true); // capture to run even if someone re-adds inline handlers
        }
      },
  
      utils: {
        removeInlineOnsubmit() {
          // Remove any lingering inline handlers to avoid double alerts
          $$('form[onsubmit]').forEach(f => f.removeAttribute('onsubmit'));
        },
        updateYear() {
          const y = $('#year');
          if (y) y.textContent = String(new Date().getFullYear());
        },
        injectLogo() {
          const dataUri = window.SCHOOL_LOGO_DATA_URI; // set this before including this file, if desired
          if (!dataUri) return;
          const img = $('header .brand img');
          if (img) img.src = dataUri;
        }
      }
    };
  
    // Expose if you want to tinker in the console
    window.SchoolApp = SchoolApp;
  
    // Boot it up
    SchoolApp.init();
  
  })(window, document);
  

  document.addEventListener('DOMContentLoaded', function() {
    // --- FILTERING LOGIC ---
    const filterControls = document.querySelector('.filter-controls');
    const galleryItems = document.querySelectorAll('.gallery-item');

    if (filterControls) {
        filterControls.addEventListener('click', function(e) {
            if (e.target.classList.contains('filter-btn')) {
                filterControls.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
                const filterValue = e.target.getAttribute('data-filter');

                galleryItems.forEach(item => {
                    if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    }

    // --- LIGHTBOX LOGIC ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    let currentIndex = 0;
    let visibleItems = [];

    function updateVisibleItems() {
        visibleItems = [];
        galleryItems.forEach(item => {
            if (item.style.display !== 'none') {
                visibleItems.push(item);
            }
        });
    }

    function showLightbox(index) {
        if (index < 0 || index >= visibleItems.length) return;
        currentIndex = index;
        const item = visibleItems[currentIndex];
        const imageSrc = item.getAttribute('href');
        const imageCaption = item.querySelector('img').getAttribute('alt');

        lightboxImage.setAttribute('src', imageSrc);
        lightboxCaption.textContent = imageCaption;
        lightbox.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    function showNext() {
        const nextIndex = (currentIndex + 1) % visibleItems.length;
        showLightbox(nextIndex);
    }

    function showPrev() {
        const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
        showLightbox(prevIndex);
    }

    galleryItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            updateVisibleItems();
            const itemIndex = visibleItems.indexOf(item);
            showLightbox(itemIndex);
        });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { 
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
    lightboxNext.addEventListener('click', showNext);
    lightboxPrev.addEventListener('click', showPrev);

    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('show')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        }
    });
});

    // --- jOBS JS ---


document.addEventListener('DOMContentLoaded', function() {
    const allViews = document.querySelectorAll('.view');
    
    // --- Router Function ---
    function showView() {
      // Default to the 'list' view if no hash is present
      const viewId = window.location.hash.substring(1) || 'list';
      
      let viewFound = false;
      allViews.forEach(view => {
        if (view.dataset.view === viewId) {
          view.classList.add('active');
          viewFound = true;
        } else {
          view.classList.remove('active');
        }
      });
      
      // If an invalid hash is entered, show the list view
      if (!viewFound) {
        document.querySelector('[data-view="list"]').classList.add('active');
      }
      
      // Scroll to the top of the main content area on view change
      window.scrollTo(0, 0);
    }
    
    // --- Set Dynamic Closing Dates ---
    const today = new Date('2025-08-17T15:02:05'); // Using the provided current time
    const closingDate = new Date(today);
    closingDate.setDate(today.getDate() + 31); // ~1 month from now
    
    const closingDateExtended = new Date(today);
    closingDateExtended.setDate(today.getDate() + 45); // ~1.5 months from now
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = closingDate.toLocaleDateString('en-US', options);
    const formattedDateExtended = closingDateExtended.toLocaleDateString('en-US', options);
    
    document.querySelectorAll('.closing-date').forEach(el => {
      el.textContent = 'Closing: ' + formattedDate;
    });
    document.querySelectorAll('.closing-date-extended').forEach(el => {
      el.textContent = 'Closing: ' + formattedDateExtended;
    });

    // --- Event Listeners ---
    // Show the correct view when the hash changes
    window.addEventListener('hashchange', showView);
    
    // Show the correct view on initial page load
    showView();
  });


  // --- NEWS JS ---

  document.addEventListener('DOMContentLoaded', function() {
    const allViews = document.querySelectorAll('.view');
    function showView() {
      let viewId = window.location.hash.substring(1) || 'list';
      const targetView = document.querySelector(`.view[data-view="${viewId}"]`);
      if (!targetView) { viewId = 'list'; }
      allViews.forEach(view => {
        if (view.dataset.view === viewId) { view.classList.add('active'); } 
        else { view.classList.remove('active'); }
      });
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', showView);
    showView();
  });

  

  // --- Admissions JS ---
document.getElementById('year').textContent = new Date().getFullYear();

// Swap flow diagram based on screen width (keeps DOM light & simple)
function toggleFlow(){
  const mobile = window.matchMedia('(max-width: 720px)').matches;
  document.querySelector('.flow.h').style.display = mobile ? 'none' : 'grid';
  document.querySelector('.flow.v').style.display = mobile ? 'block' : 'none';
}
toggleFlow();
window.addEventListener('resize', toggleFlow);

// Curriculum JS
document.getElementById('year').textContent = new Date().getFullYear();

// Theme initialization: prefers-color-scheme on first visit, else saved preference
const root = document.documentElement;
const saved = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initial = saved || (prefersDark ? 'dark' : 'light');
setTheme(initial);

// Toggle button behavior
const btn = document.getElementById('themeToggle');
function setTheme(mode){
  root.setAttribute('data-theme', mode);
  localStorage.setItem('theme', mode);
  const isDark = mode === 'dark';
  btn.setAttribute('aria-pressed', String(isDark));
  // Swap icons
  document.getElementById('iconMoon').style.display = isDark ? 'none' : '';
  document.getElementById('iconSun').style.display  = isDark ? '' : 'none';
}
btn.addEventListener('click', ()=>{
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
});

// Keep in sync if OS preference changes and user hasn't chosen yet
if(!saved && window.matchMedia){
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e)=>{
    setTheme(e.matches ? 'dark' : 'light');
  });
}
