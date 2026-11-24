// portfolio-cms.js — Schema-driven Portfolio Renderer + Developer Section & Layout CMS Studio

(function () {
  const STORAGE_KEY = "portfolio_cms_config_v1";
  const UNLOCK_KEY = "portfolio_cms_unlocked_v1";
  const LOCKOUT_KEY = "portfolio_cms_lockout_v1";
  let config = null;
  let activeProjectFilter = "all";
  let studioOpen = false;
  let activeStudioTab = "sections";
  let selectedSectionIdx = 0;
  let selectedProjectIdx = 0;

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(String(text || ""));
    if (window.crypto && window.crypto.subtle) {
      const buf = await window.crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return "";
  }

  function isLocalHost() {
    const p = window.location.protocol;
    const h = window.location.hostname;
    return p === "file:" || h === "localhost" || h === "127.0.0.1" || h === "";
  }

  function getStudioSec() {
    if (!config.systemSettings.studioSecurity) {
      config.systemSettings.studioSecurity = {
        requirePassphrase: true,
        localOnly: false,
        passphraseHash: "243d7ce86a296929887f900d717222fae01072e9cdceb6f2056fe413e76ac325"
      };
    }
    return config.systemSettings.studioSecurity;
  }

  function isStudioUnlocked() {
    const sec = getStudioSec();
    if (!sec.requirePassphrase) return true;
    return sessionStorage.getItem(UNLOCK_KEY) === sec.passphraseHash;
  }

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(url) {
    const s = String(url ?? "").trim();
    if (!s) return "";
    if (/^(https?:|mailto:|tel:|#|Project%20Files\/|screenshots\/)/i.test(s) || /^[a-zA-Z0-9_\-./%]+$/.test(s)) {
      return s;
    }
    return "#";
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  async function loadConfig() {
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        config = JSON.parse(draft);
        return;
      } catch (_) {}
    }
    if (window.location.protocol !== "file:") {
      try {
        const res = await fetch("portfolio-config.json", { cache: "no-store" });
        if (res.ok) {
          config = await res.json();
          return;
        }
      } catch (_) {}
    }
    config = deepClone(window.DEFAULT_PORTFOLIO_CONFIG);
  }

  function saveDraft() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function applySystemTokens() {
    const sys = config.systemSettings || {};
    const t = sys.tokens || {};
    const r = document.documentElement.style;
    r.setProperty("--bg", t.bg || "#f7f6f2");
    r.setProperty("--surface", t.surface || "#ffffff");
    r.setProperty("--surface-subtle", t.surfaceSubtle || "#efece4");
    r.setProperty("--ink", t.ink || "#161615");
    r.setProperty("--ink-muted", t.inkMuted || "#575651");
    r.setProperty("--border", t.border || "#dfddd4");
    r.setProperty("--accent", t.accent || "#1e4d3b");
    r.setProperty("--radius", `${Number(t.radius ?? 6)}px`);
    r.setProperty("--max-width", `${Number(t.maxWidth ?? 1080)}px`);
    r.setProperty("--font-scale", String(Number(t.fontScale ?? 1)));

    document.title = sys.siteTitle || "Portfolio";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && sys.seoDescription) metaDesc.setAttribute("content", sys.seoDescription);
  }

  function renderNav() {
    const sys = config.systemSettings || {};
    const brandEl = document.getElementById("navBrand");
    const linksEl = document.getElementById("navLinks");
    const statusEl = document.getElementById("navStatusPill");

    if (brandEl) brandEl.textContent = sys.brandName || "Portfolio";
    if (statusEl) {
      if (sys.showAvailability && sys.availabilityLabel) {
        statusEl.textContent = sys.availabilityLabel;
        statusEl.style.display = "inline-flex";
      } else {
        statusEl.style.display = "none";
      }
    }

    if (linksEl) {
      const navSections = (config.sections || []).filter(s => s.visible && s.type !== "hero");
      const anchors = navSections.map(s => `<a href="#sec-${esc(s.id)}">${esc(s.title || s.id)}</a>`).join("");
      linksEl.innerHTML = `${anchors}<a href="#contact">Contact</a>`;
    }
  }

  function renderHeroSection(sec) {
    const d = sec.data || {};
    const layout = sec.layout || "split-ledger";
    const alignClass = sec.style?.align === "center" ? "text-align:center;" : "";

    const leftHtml = `
      <div style="${alignClass}">
        ${sec.kicker ? `<div class="kicker">${esc(sec.kicker)}</div>` : ""}
        <h1>${esc(sec.title)}</h1>
        ${d.lead ? `<p class="hero-lead" style="${sec.style?.align === "center" ? "margin-left:auto;margin-right:auto;" : ""}">${esc(d.lead)}</p>` : ""}
        <div class="cta-row" style="${sec.style?.align === "center" ? "justify-content:center;" : ""}">
          ${d.primaryCtaLabel ? `<a class="btn primary" href="${esc(safeUrl(d.primaryCtaHref))}">${esc(d.primaryCtaLabel)}</a>` : ""}
          ${d.secondaryCtaLabel ? `<a class="btn" href="${esc(safeUrl(d.secondaryCtaHref))}" target="_blank" rel="noopener noreferrer">${esc(d.secondaryCtaLabel)}</a>` : ""}
          ${config.systemSettings?.github ? `<a class="btn" href="${esc(safeUrl(config.systemSettings.github))}" target="_blank" rel="noopener noreferrer">GitHub &#8599;</a>` : ""}
          <a class="btn" href="mailto:${esc(config.systemSettings?.email || "johnbricksireneo@gmail.com")}?subject=Resume%20Request">Request CV &#8599;</a>
          <a class="btn" href="#sec-projects">Browse Projects</a>
        </div>
      </div>
    `;

    const ledgerHtml = (d.facts || []).length ? `
      <aside class="facts-ledger" aria-label="Quick Profile">
        ${(d.facts || []).map(f => `
          <div class="fact-row">
            <span class="fact-label">${esc(f.label)}</span>
            <span class="fact-val">${f.href ? `<a href="${esc(safeUrl(f.href))}">${esc(f.value)}</a>` : esc(f.value)}</span>
          </div>
        `).join("")}
      </aside>
    ` : "";

    if (layout === "minimal") {
      return `<div class="hero-minimal">${leftHtml}</div>`;
    }
    if (layout === "stacked") {
      return `<div class="hero-stacked">${leftHtml}<div style="margin-top:28px;">${ledgerHtml}</div></div>`;
    }
    return `<div class="hero-grid">${leftHtml}${ledgerHtml}</div>`;
  }

  function renderProjectCard(item, index, layout) {
    const isFeatured = layout === "2-col-featured" && item.featured;
    const isRow = layout === "editorial-list";
    const num = String(index + 1).padStart(2, "0");

    let topMedia = "";
    if (!isRow) {
      if (item.image) {
        const cls = item.imageMode === "logo" ? "media-frame logo-frame" : "media-frame";
        const imgStyle = item.imageMode === "contain" ? 'style="object-fit:contain;padding:8px;background:#f0efe9;"' : "";
        topMedia = `<div class="${cls}"><img src="${esc(safeUrl(item.image))}" alt="${esc(item.imageAlt || item.title)}" ${imgStyle} /></div>`;
      } else if (Array.isArray(item.metrics) && item.metrics.length) {
        topMedia = `
          <div class="metrics-frame">
            ${item.metrics.map(m => `
              <div class="metric-cell">
                <div class="metric-num">${esc(m.num)}</div>
                <div class="metric-label">${esc(m.label)}</div>
                <div class="metric-sub">${esc(m.sub || "")}</div>
              </div>
            `).join("")}
          </div>
        `;
      } else if (item.deck && item.deck.href) {
        topMedia = `
          <div class="deck-frame">
            <div>
              <div class="deck-badge">${esc(item.deck.badge || "")}</div>
              <div class="deck-title">${esc(item.deck.title || item.title)}</div>
              <div style="font-size:0.82rem;color:#cbc7bc;">${esc(item.deck.subtitle || "")}</div>
            </div>
            <a class="deck-link" href="${esc(safeUrl(item.deck.href))}" target="_blank" rel="noopener noreferrer">${esc(item.deck.buttonLabel || "View Slides ↗")}</a>
          </div>
        `;
      }
    }

    let footRight = `<span>${esc(item.footerRight || "")}</span>`;
    if (item.footerLinkHref) {
      const link1 = `<a href="${esc(safeUrl(item.footerLinkHref))}" target="_blank" rel="noopener noreferrer">${esc(item.footerLinkLabel || "Open ↗")}</a>`;
      const link2 = item.footerSecondaryLinkHref
        ? `<a href="${esc(safeUrl(item.footerSecondaryLinkHref))}" target="_blank" rel="noopener noreferrer">${esc(item.footerSecondaryLinkLabel || "Source ↗")}</a>`
        : "";
      footRight = `<span style="display:inline-flex;gap:14px;align-items:center;">${link1}${link2}</span>`;
    }

    return `
      <article class="card ${isFeatured ? "featured" : ""} ${isRow ? "row-card" : ""}" data-cat="${esc(item.cat || "fullstack")}">
        ${topMedia}
        <div class="card-body">
          <div class="card-meta">
            <span class="cat-accent">${esc(item.meta || "")}</span>
            <span>${num}</span>
          </div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.description)}</p>
          ${item.specNote ? `<div class="spec-note">${esc(item.specNote)}</div>` : ""}
          <div class="tech-row">
            ${(item.tech || []).map(t => `<span class="tech">${esc(t)}</span>`).join("")}
          </div>
          <div class="card-foot">
            <span>${esc(item.footerLeft || "")}</span>
            ${footRight}
          </div>
        </div>
      </article>
    `;
  }

  function renderProjectsSection(sec) {
    const items = ((sec.data && sec.data.items) || []).filter(i => i.visible !== false);
    const layout = sec.layout || "2-col-featured";
    const showFilter = config.systemSettings?.features?.enableFilterBar !== false;

    const filterHtml = showFilter ? `
      <div class="filter-bar">
        ${[
          ["all", "All"],
          ["fullstack", "Full-Stack & Automation"],
          ["mobile", "Mobile & Game Dev"],
          ["infra", "APIs & IT Ops"]
        ].map(([cat, label]) => `
          <button type="button" class="filter-btn ${activeProjectFilter === cat ? "active" : ""}" data-filter="${cat}">${esc(label)}</button>
        `).join("")}
      </div>
    ` : "";

    const filtered = activeProjectFilter === "all"
      ? items
      : items.filter(i => String(i.cat || "").split(/\s+/).includes(activeProjectFilter));

    const gridClass = layout === "3-col"
      ? "project-grid cols-3-grid"
      : layout === "editorial-list"
        ? "project-grid list-grid"
        : "project-grid";

    return `
      <div class="section-head" ${sec.style?.align === "center" ? 'style="justify-content:center;text-align:center;"' : ""}>
        <div>
          ${sec.kicker ? `<span class="section-num">${esc(sec.kicker)}</span>` : ""}
          <h2>${esc(sec.title)}</h2>
        </div>
        ${filterHtml}
      </div>
      <div class="${gridClass}" id="projectGrid">
        ${filtered.map((item, idx) => renderProjectCard(item, idx, layout)).join("")}
      </div>
    `;
  }

  function renderCapabilitiesSection(sec) {
    const items = (sec.data && sec.data.items) || [];
    const layout = sec.layout || "3-col";
    const cls = layout === "rows" ? "stack-rows" : layout === "2-col" ? "cols-2" : "cols-3";
    return `
      <div class="section-head">
        <div>
          ${sec.kicker ? `<span class="section-num">${esc(sec.kicker)}</span>` : ""}
          <h2>${esc(sec.title)}</h2>
        </div>
      </div>
      <div class="${cls}">
        ${items.map(it => `
          <div class="panel">
            <h4>${esc(it.title)}</h4>
            <p>${esc(it.body)}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderExperienceSection(sec) {
    const items = (sec.data && sec.data.items) || [];
    const layout = sec.layout || "2-col";
    const cls = layout === "timeline-rows" ? "stack-rows" : "cols-2";
    return `
      <div class="section-head">
        <div>
          ${sec.kicker ? `<span class="section-num">${esc(sec.kicker)}</span>` : ""}
          <h2>${esc(sec.title)}</h2>
        </div>
      </div>
      <div class="${cls}">
        ${items.map(it => `
          <div class="panel">
            ${it.period ? `<span class="sub-meta">${esc(it.period)}</span>` : ""}
            <h4>${esc(it.title)}</h4>
            <p>${esc(it.body)}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderMetricsSection(sec) {
    const items = (sec.data && sec.data.items) || [];
    const cls = sec.layout === "2-col" ? "cols-2" : "cols-4";
    return `
      <div class="section-head">
        <div>
          ${sec.kicker ? `<span class="section-num">${esc(sec.kicker)}</span>` : ""}
          <h2>${esc(sec.title)}</h2>
        </div>
      </div>
      <div class="${cls}">
        ${items.map(m => `
          <div class="panel">
            <div class="metric-num" style="font-size:1.45rem;">${esc(m.num)}</div>
            <h4 style="margin-top:6px;">${esc(m.label)}</h4>
            <p>${esc(m.sub || "")}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCustomSection(sec) {
    const d = sec.data || {};
    const split = sec.layout === "split";
    return `
      <div class="${split ? "cols-2" : ""}">
        <div>
          ${sec.kicker ? `<span class="section-num">${esc(sec.kicker)}</span>` : ""}
          <h2>${esc(sec.title)}</h2>
        </div>
        <div class="panel">
          <p>${esc(d.body || "")}</p>
          ${d.ctaLabel ? `<div style="margin-top:14px;"><a class="btn" href="${esc(safeUrl(d.ctaHref || "#"))}">${esc(d.ctaLabel)}</a></div>` : ""}
        </div>
      </div>
    `;
  }

  function renderSections() {
    const mainEl = document.getElementById("portfolioMain");
    if (!mainEl) return;

    const html = (config.sections || [])
      .filter(s => s.visible !== false)
      .map(sec => {
        const st = sec.style || {};
        const classes = [
          "cms-section",
          `surface-${st.surface || "paper"}`,
          `pad-${st.padding || "normal"}`,
          st.divider !== false ? "has-divider" : ""
        ].filter(Boolean).join(" ");

        let inner = "";
        if (sec.type === "hero") inner = renderHeroSection(sec);
        else if (sec.type === "projects") inner = renderProjectsSection(sec);
        else if (sec.type === "capabilities") inner = renderCapabilitiesSection(sec);
        else if (sec.type === "experience") inner = renderExperienceSection(sec);
        else if (sec.type === "metrics") inner = renderMetricsSection(sec);
        else inner = renderCustomSection(sec);

        return `
          <section id="sec-${esc(sec.id)}" class="${classes}">
            <div class="container">${inner}</div>
          </section>
        `;
      }).join("");

    mainEl.innerHTML = html;

    // Bind filter buttons
    mainEl.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeProjectFilter = btn.dataset.filter || "all";
        renderSections();
      });
    });

    // Bind lightbox on non-logo images
    if (config.systemSettings?.features?.enableLightbox !== false) {
      mainEl.querySelectorAll(".media-frame:not(.logo-frame) img").forEach(img => {
        img.addEventListener("click", () => {
          const lb = document.getElementById("lightbox");
          const lbImg = document.getElementById("lightboxImg");
          if (lb && lbImg) {
            lbImg.src = img.src;
            lb.classList.add("open");
          }
        });
      });
    }
  }

  function renderFooter() {
    const sys = config.systemSettings || {};
    const footerEl = document.getElementById("portfolioFooter");
    if (!footerEl) return;
    footerEl.innerHTML = `
      <div class="container footer-inner">
        <div><strong>${esc(sys.brandName || "")}</strong> &middot; ${esc(sys.location || "")}</div>
        <div class="footer-links">
          ${sys.phone ? `<a href="tel:${esc(sys.phone.replace(/\s+/g, ""))}">${esc(sys.phone)}</a>` : ""}
          ${sys.email ? `<a href="mailto:${esc(sys.email)}">${esc(sys.email)}</a>` : ""}
          ${sys.linkedin ? `<a href="${esc(safeUrl(sys.linkedin))}" target="_blank" rel="noopener noreferrer">LinkedIn &#8599;</a>` : ""}
          ${sys.github ? `<a href="${esc(safeUrl(sys.github))}" target="_blank" rel="noopener noreferrer">GitHub &#8599;</a>` : ""}
        </div>
      </div>
    `;
  }

  function renderPortfolio() {
    applySystemTokens();
    renderNav();
    renderSections();
    renderFooter();
  }

  // ==================== DEVELOPER CMS STUDIO DRAWER ====================
  function layoutOptionsForType(type) {
    if (type === "hero") return [["split-ledger", "Split + Quick Facts Ledger"], ["stacked", "Stacked Hero + Ledger"], ["minimal", "Minimal Editorial"]];
    if (type === "projects") return [["2-col-featured", "2-Col (Featured Full-Width)"], ["2-col-even", "2-Col Even Grid"], ["3-col", "3-Col Compact Grid"], ["editorial-list", "Editorial List Rows"]];
    if (type === "capabilities") return [["3-col", "3-Column Grid"], ["2-col", "2-Column Grid"], ["rows", "Full-Width Rows"]];
    if (type === "experience") return [["2-col", "2-Column Cards"], ["timeline-rows", "Timeline Rows"]];
    if (type === "metrics") return [["4-col", "4-Column KPI Strip"], ["2-col", "2-Column KPI Grid"]];
    return [["split", "2-Column Split"], ["full-width", "Full-Width Block"]];
  }

  function syncAndRender() {
    saveDraft();
    renderPortfolio();
    renderStudioBody();
  }

  function renderStudioBody() {
    const body = document.getElementById("cmsStudioBody");
    if (!body) return;

    document.querySelectorAll(".cms-tab-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.tab === activeStudioTab);
    });

    if (activeStudioTab === "sections") {
      const secs = config.sections || [];
      if (selectedSectionIdx >= secs.length) selectedSectionIdx = Math.max(0, secs.length - 1);
      const sec = secs[selectedSectionIdx];

      body.innerHTML = `
        <div class="cms-group">
          <div class="cms-group-head">
            <span>Page Sections (${secs.length})</span>
            <select id="cmsAddSectionType" class="cms-input" style="width:auto;">
              <option value="metrics">+ Add Metrics Strip</option>
              <option value="custom">+ Add Custom Block</option>
              <option value="capabilities">+ Add Capabilities</option>
              <option value="experience">+ Add Experience</option>
              <option value="projects">+ Add Projects</option>
            </select>
            <button type="button" id="cmsAddSectionBtn" class="cms-btn-sm primary">Add</button>
          </div>
          <div class="cms-list">
            ${secs.map((s, idx) => `
              <div class="cms-list-item ${idx === selectedSectionIdx ? "selected" : ""}" data-sec-idx="${idx}">
                <button type="button" class="cms-item-select" data-sec-idx="${idx}">
                  <span class="cms-mono">${String(idx + 1).padStart(2, "0")}</span>
                  <span>${esc(s.title || s.id)}</span>
                  <span class="cms-pill">${esc(s.type)}</span>
                </button>
                <div class="cms-item-actions">
                  <button type="button" class="cms-icon-btn" data-sec-act="toggle" data-idx="${idx}" title="Show/Hide">${s.visible ? "👁" : "🚫"}</button>
                  <button type="button" class="cms-icon-btn" data-sec-act="up" data-idx="${idx}" title="Move Up">↑</button>
                  <button type="button" class="cms-icon-btn" data-sec-act="down" data-idx="${idx}" title="Move Down">↓</button>
                  ${secs.length > 1 ? `<button type="button" class="cms-icon-btn danger" data-sec-act="del" data-idx="${idx}" title="Delete">×</button>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        ${sec ? `
          <div class="cms-group">
            <div class="cms-group-head"><span>Selected Section: ${esc(sec.id)}</span></div>
            <label class="cms-label">Kicker / Eyebrow
              <input class="cms-input" id="secKickerIn" value="${esc(sec.kicker || "")}" />
            </label>
            <label class="cms-label">Section Heading
              <input class="cms-input" id="secTitleIn" value="${esc(sec.title || "")}" />
            </label>
            <div class="cms-row-2">
              <label class="cms-label">Layout
                <select class="cms-input" id="secLayoutIn">
                  ${layoutOptionsForType(sec.type).map(([val, lbl]) => `<option value="${val}" ${sec.layout === val ? "selected" : ""}>${esc(lbl)}</option>`).join("")}
                </select>
              </label>
              <label class="cms-label">Surface Theme
                <select class="cms-input" id="secSurfaceIn">
                  ${[["paper", "Warm Paper"], ["white", "Pure White"], ["subtle", "Subtle Sand"], ["ink", "Dark Ink"]].map(([v, l]) => `<option value="${v}" ${(sec.style?.surface || "paper") === v ? "selected" : ""}>${l}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="cms-row-2">
              <label class="cms-label">Vertical Padding
                <select class="cms-input" id="secPadIn">
                  ${[["compact", "Compact"], ["normal", "Normal"], ["spacious", "Spacious"]].map(([v, l]) => `<option value="${v}" ${(sec.style?.padding || "normal") === v ? "selected" : ""}>${l}</option>`).join("")}
                </select>
              </label>
              <label class="cms-label">Alignment
                <select class="cms-input" id="secAlignIn">
                  <option value="left" ${(sec.style?.align || "left") === "left" ? "selected" : ""}>Left</option>
                  <option value="center" ${sec.style?.align === "center" ? "selected" : ""}>Center</option>
                </select>
              </label>
            </div>
            <label class="cms-check">
              <input type="checkbox" id="secDividerIn" ${sec.style?.divider !== false ? "checked" : ""} />
              Show bottom 1px hairline divider
            </label>
          </div>
        ` : ""}
      `;

      body.querySelectorAll(".cms-item-select").forEach(btn => {
        btn.addEventListener("click", () => {
          selectedSectionIdx = Number(btn.dataset.secIdx);
          renderStudioBody();
        });
      });

      body.querySelectorAll("[data-sec-act]").forEach(btn => {
        btn.addEventListener("click", () => {
          const i = Number(btn.dataset.idx);
          const act = btn.dataset.secAct;
          if (act === "toggle") secs[i].visible = !secs[i].visible;
          else if (act === "up" && i > 0) { [secs[i - 1], secs[i]] = [secs[i], secs[i - 1]]; selectedSectionIdx = i - 1; }
          else if (act === "down" && i < secs.length - 1) { [secs[i + 1], secs[i]] = [secs[i], secs[i + 1]]; selectedSectionIdx = i + 1; }
          else if (act === "del") { secs.splice(i, 1); selectedSectionIdx = Math.max(0, i - 1); }
          syncAndRender();
        });
      });

      document.getElementById("cmsAddSectionBtn")?.addEventListener("click", () => {
        const type = document.getElementById("cmsAddSectionType").value;
        const id = `${type}-${Date.now().toString(36).slice(-4)}`;
        const templates = {
          metrics: { id, type: "metrics", visible: true, kicker: "KEY METRICS", title: "Production Impact", layout: "4-col", style: { surface: "white", padding: "normal", divider: true, align: "left" }, data: { items: [{ num: "99.9%", label: "Uptime Target", sub: "Monitored 24/7" }, { num: "22+", label: "Services", sub: "Production stack" }] } },
          custom: { id, type: "custom", visible: true, kicker: "NOTES", title: "Custom Engineering Block", layout: "split", style: { surface: "subtle", padding: "normal", divider: true, align: "left" }, data: { body: "Add custom architecture notes, certifications, or open-source highlights here.", ctaLabel: "", ctaHref: "" } },
          capabilities: { id, type: "capabilities", visible: true, kicker: "SKILLS", title: "Additional Capabilities", layout: "3-col", style: { surface: "paper", padding: "normal", divider: true, align: "left" }, data: { items: [{ title: "Core Stack", body: "Add tools or frameworks here." }] } },
          experience: { id, type: "experience", visible: true, kicker: "TIMELINE", title: "Certifications & Awards", layout: "2-col", style: { surface: "paper", padding: "normal", divider: true, align: "left" }, data: { items: [{ period: "2025", title: "INFOTECHNOLYPICS 2025", body: "2nd Runner-Up — Android App Development Game." }] } },
          projects: { id, type: "projects", visible: true, kicker: "ARCHIVE", title: "More Projects", layout: "2-col-even", style: { surface: "paper", padding: "normal", divider: true, align: "left" }, data: { items: [] } }
        };
        config.sections.push(templates[type]);
        selectedSectionIdx = config.sections.length - 1;
        syncAndRender();
      });

      if (sec) {
        document.getElementById("secKickerIn")?.addEventListener("input", e => { sec.kicker = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("secTitleIn")?.addEventListener("input", e => { sec.title = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("secLayoutIn")?.addEventListener("change", e => { sec.layout = e.target.value; syncAndRender(); });
        document.getElementById("secSurfaceIn")?.addEventListener("change", e => { sec.style = sec.style || {}; sec.style.surface = e.target.value; syncAndRender(); });
        document.getElementById("secPadIn")?.addEventListener("change", e => { sec.style = sec.style || {}; sec.style.padding = e.target.value; syncAndRender(); });
        document.getElementById("secAlignIn")?.addEventListener("change", e => { sec.style = sec.style || {}; sec.style.align = e.target.value; syncAndRender(); });
        document.getElementById("secDividerIn")?.addEventListener("change", e => { sec.style = sec.style || {}; sec.style.divider = e.target.checked; syncAndRender(); });
      }
    } else if (activeStudioTab === "content") {
      const heroSec = (config.sections || []).find(s => s.type === "hero");
      const projSec = (config.sections || []).find(s => s.type === "projects");
      const projects = projSec?.data?.items || [];
      if (selectedProjectIdx >= projects.length) selectedProjectIdx = Math.max(0, projects.length - 1);
      const p = projects[selectedProjectIdx];

      body.innerHTML = `
        ${heroSec ? `
          <div class="cms-group">
            <div class="cms-group-head"><span>Hero Content</span></div>
            <label class="cms-label">Headline
              <input class="cms-input" id="heroHeadlineIn" value="${esc(heroSec.title || "")}" />
            </label>
            <label class="cms-label">Lead Bio
              <textarea class="cms-input" rows="3" id="heroLeadIn">${esc(heroSec.data?.lead || "")}</textarea>
            </label>
          </div>
        ` : ""}
        ${projSec ? `
          <div class="cms-group">
            <div class="cms-group-head">
              <span>Projects (${projects.length})</span>
              <button type="button" id="cmsAddProjBtn" class="cms-btn-sm primary">+ Add Project</button>
            </div>
            <div class="cms-list">
              ${projects.map((item, idx) => `
                <div class="cms-list-item ${idx === selectedProjectIdx ? "selected" : ""}">
                  <button type="button" class="cms-item-select" data-proj-idx="${idx}">
                    <span class="cms-mono">${String(idx + 1).padStart(2, "0")}</span>
                    <span>${esc(item.title)}</span>
                  </button>
                  <div class="cms-item-actions">
                    <button type="button" class="cms-icon-btn" data-proj-act="toggle" data-idx="${idx}" title="Show/Hide">${item.visible !== false ? "👁" : "🚫"}</button>
                    <button type="button" class="cms-icon-btn" data-proj-act="feat" data-idx="${idx}" title="Featured Full-Width">${item.featured ? "★" : "☆"}</button>
                    <button type="button" class="cms-icon-btn" data-proj-act="up" data-idx="${idx}">↑</button>
                    <button type="button" class="cms-icon-btn" data-proj-act="down" data-idx="${idx}">↓</button>
                    <button type="button" class="cms-icon-btn danger" data-proj-act="del" data-idx="${idx}">×</button>
                  </div>
                </div>
              `).join("")}
            </div>
            ${p ? `
              <div style="margin-top:12px;">
                <label class="cms-label">Title <input class="cms-input" id="pTitleIn" value="${esc(p.title || "")}" /></label>
                <div class="cms-row-2">
                  <label class="cms-label">Meta Tag <input class="cms-input" id="pMetaIn" value="${esc(p.meta || "")}" /></label>
                  <label class="cms-label">Filter Category <input class="cms-input" id="pCatIn" value="${esc(p.cat || "fullstack")}" /></label>
                </div>
                <label class="cms-label">Description <textarea class="cms-input" rows="3" id="pDescIn">${esc(p.description || "")}</textarea></label>
                <label class="cms-label">Tech Stack (comma separated) <input class="cms-input" id="pTechIn" value="${esc((p.tech || []).join(", "))}" /></label>
                <label class="cms-label">External Link URL (optional) <input class="cms-input" id="pLinkIn" value="${esc(p.footerLinkHref || "")}" /></label>
              </div>
            ` : ""}
          </div>
        ` : ""}
      `;

      document.getElementById("heroHeadlineIn")?.addEventListener("input", e => { heroSec.title = e.target.value; saveDraft(); renderPortfolio(); });
      document.getElementById("heroLeadIn")?.addEventListener("input", e => { heroSec.data.lead = e.target.value; saveDraft(); renderPortfolio(); });

      body.querySelectorAll("[data-proj-idx]").forEach(b => {
        b.addEventListener("click", () => { selectedProjectIdx = Number(b.dataset.projIdx); renderStudioBody(); });
      });

      body.querySelectorAll("[data-proj-act]").forEach(b => {
        b.addEventListener("click", () => {
          const i = Number(b.dataset.idx);
          const act = b.dataset.projAct;
          if (act === "toggle") projects[i].visible = projects[i].visible === false;
          else if (act === "feat") projects[i].featured = !projects[i].featured;
          else if (act === "up" && i > 0) { [projects[i - 1], projects[i]] = [projects[i], projects[i - 1]]; selectedProjectIdx = i - 1; }
          else if (act === "down" && i < projects.length - 1) { [projects[i + 1], projects[i]] = [projects[i], projects[i + 1]]; selectedProjectIdx = i + 1; }
          else if (act === "del") { projects.splice(i, 1); selectedProjectIdx = Math.max(0, i - 1); }
          syncAndRender();
        });
      });

      document.getElementById("cmsAddProjBtn")?.addEventListener("click", () => {
        projects.push({
          id: `proj-${Date.now().toString(36).slice(-4)}`,
          visible: true,
          featured: false,
          cat: "fullstack",
          meta: "New Project",
          title: "Untitled Engineering Project",
          description: "Describe the architecture, stack, and measurable impact.",
          tech: ["JavaScript", "Python"],
          footerLeft: "Personal / Client",
          footerRight: "Case Study"
        });
        selectedProjectIdx = projects.length - 1;
        syncAndRender();
      });

      if (p) {
        document.getElementById("pTitleIn")?.addEventListener("input", e => { p.title = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("pMetaIn")?.addEventListener("input", e => { p.meta = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("pCatIn")?.addEventListener("input", e => { p.cat = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("pDescIn")?.addEventListener("input", e => { p.description = e.target.value; saveDraft(); renderPortfolio(); });
        document.getElementById("pTechIn")?.addEventListener("input", e => {
          p.tech = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
          saveDraft(); renderPortfolio();
        });
        document.getElementById("pLinkIn")?.addEventListener("input", e => {
          p.footerLinkHref = e.target.value.trim();
          if (p.footerLinkHref && !p.footerLinkLabel) p.footerLinkLabel = "Open ↗";
          saveDraft(); renderPortfolio();
        });
      }
    } else if (activeStudioTab === "system") {
      const sys = config.systemSettings;
      const t = sys.tokens;
      const f = sys.features;

      body.innerHTML = `
        <div class="cms-group">
          <div class="cms-group-head"><span>Design Tokens &amp; Typography</span></div>
          <div class="cms-row-2">
            <label class="cms-label">Canvas (--bg) <input type="color" class="cms-color" id="tokBg" value="${esc(t.bg)}" /></label>
            <label class="cms-label">Surface (--surface) <input type="color" class="cms-color" id="tokSurface" value="${esc(t.surface)}" /></label>
            <label class="cms-label">Ink (--ink) <input type="color" class="cms-color" id="tokInk" value="${esc(t.ink)}" /></label>
            <label class="cms-label">Brand Accent (--accent) <input type="color" class="cms-color" id="tokAccent" value="${esc(t.accent)}" /></label>
          </div>
          <div class="cms-row-2">
            <label class="cms-label">Corner Radius: <span id="radVal">${t.radius}px</span>
              <input type="range" min="0" max="14" value="${t.radius}" id="tokRadius" />
            </label>
            <label class="cms-label">Max Width: <span id="mwVal">${t.maxWidth}px</span>
              <input type="range" min="920" max="1260" step="20" value="${t.maxWidth}" id="tokMaxWidth" />
            </label>
          </div>
        </div>

        <div class="cms-group">
          <div class="cms-group-head"><span>Site Identity, SEO &amp; Contact</span></div>
          <label class="cms-label">Site Title <input class="cms-input" id="sysTitleIn" value="${esc(sys.siteTitle)}" /></label>
          <label class="cms-label">Brand Name <input class="cms-input" id="sysBrandIn" value="${esc(sys.brandName)}" /></label>
          <label class="cms-label">Availability Pill <input class="cms-input" id="sysAvailIn" value="${esc(sys.availabilityLabel || "")}" /></label>
          <div class="cms-row-2">
            <label class="cms-label">Email <input class="cms-input" id="sysEmailIn" value="${esc(sys.email)}" /></label>
            <label class="cms-label">Phone <input class="cms-input" id="sysPhoneIn" value="${esc(sys.phone)}" /></label>
          </div>
          <label class="cms-label">LinkedIn URL <input class="cms-input" id="sysLiIn" value="${esc(sys.linkedin || "")}" /></label>
          <label class="cms-label">GitHub URL <input class="cms-input" id="sysGhIn" value="${esc(sys.github || "")}" /></label>
        </div>

        <div class="cms-group">
          <div class="cms-group-head"><span>Controller Feature Flags</span></div>
          <label class="cms-check"><input type="checkbox" id="featAvailIn" ${sys.showAvailability ? "checked" : ""} /> Show availability status in header</label>
          <label class="cms-check"><input type="checkbox" id="featFilterIn" ${f.enableFilterBar !== false ? "checked" : ""} /> Enable project category filter bar</label>
          <label class="cms-check"><input type="checkbox" id="featLightIn" ${f.enableLightbox !== false ? "checked" : ""} /> Enable image zoom lightbox</label>
        </div>

        <div class="cms-group">
          <div class="cms-group-head"><span>Studio Security &amp; Access Control</span></div>
          <label class="cms-check"><input type="checkbox" id="secReqPassIn" ${getStudioSec().requirePassphrase !== false ? "checked" : ""} /> Require Admin Passphrase to open Studio</label>
          <label class="cms-check"><input type="checkbox" id="secLocalOnlyIn" ${getStudioSec().localOnly ? "checked" : ""} /> Local-Only Mode (block Studio on public domains)</label>
          <div style="margin-top:10px;">
            <label class="cms-label">Change Studio Passphrase
              <div style="display:flex;gap:6px;">
                <input type="password" id="secNewPassIn" class="cms-input" placeholder="New passphrase (min 8 chars)" />
                <button type="button" id="secUpdatePassBtn" class="cms-btn-sm primary">Update</button>
              </div>
            </label>
            <div id="secPassStatus" style="font-size:0.72rem;color:#1e4d3b;min-height:16px;"></div>
          </div>
          <div style="margin-top:6px;">
            <button type="button" id="secLockNowBtn" class="cms-btn-sm">Lock Studio Session</button>
          </div>
        </div>

        <div class="cms-group">
          <div class="cms-group-head"><span>Publish &amp; Config Backup</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <button type="button" id="cmsExportJsonBtn" class="cms-btn-sm primary">Download portfolio-config.json</button>
            <button type="button" id="cmsCopyJsonBtn" class="cms-btn-sm">Copy JSON</button>
            <label class="cms-btn-sm" style="cursor:pointer;">Import JSON <input type="file" id="cmsImportFile" accept=".json" style="display:none;" /></label>
            <button type="button" id="cmsResetBtn" class="cms-btn-sm danger">Reset Default</button>
          </div>
        </div>
      `;

      const bindColor = (id, key) => {
        document.getElementById(id)?.addEventListener("input", e => {
          t[key] = e.target.value;
          saveDraft();
          applySystemTokens();
        });
      };
      bindColor("tokBg", "bg");
      bindColor("tokSurface", "surface");
      bindColor("tokInk", "ink");
      bindColor("tokAccent", "accent");

      document.getElementById("tokRadius")?.addEventListener("input", e => {
        t.radius = Number(e.target.value);
        document.getElementById("radVal").textContent = `${t.radius}px`;
        saveDraft(); applySystemTokens();
      });
      document.getElementById("tokMaxWidth")?.addEventListener("input", e => {
        t.maxWidth = Number(e.target.value);
        document.getElementById("mwVal").textContent = `${t.maxWidth}px`;
        saveDraft(); applySystemTokens();
      });

      document.getElementById("sysTitleIn")?.addEventListener("input", e => { sys.siteTitle = e.target.value; saveDraft(); applySystemTokens(); });
      document.getElementById("sysBrandIn")?.addEventListener("input", e => { sys.brandName = e.target.value; saveDraft(); renderNav(); renderFooter(); });
      document.getElementById("sysAvailIn")?.addEventListener("input", e => { sys.availabilityLabel = e.target.value; saveDraft(); renderNav(); });
      document.getElementById("sysEmailIn")?.addEventListener("input", e => { sys.email = e.target.value; saveDraft(); renderFooter(); });
      document.getElementById("sysPhoneIn")?.addEventListener("input", e => { sys.phone = e.target.value; saveDraft(); renderFooter(); });
      document.getElementById("sysLiIn")?.addEventListener("input", e => { sys.linkedin = e.target.value; saveDraft(); renderFooter(); });
      document.getElementById("sysGhIn")?.addEventListener("input", e => { sys.github = e.target.value; saveDraft(); renderFooter(); });

      document.getElementById("featAvailIn")?.addEventListener("change", e => { sys.showAvailability = e.target.checked; saveDraft(); renderNav(); });
      document.getElementById("featFilterIn")?.addEventListener("change", e => { f.enableFilterBar = e.target.checked; syncAndRender(); });
      document.getElementById("featLightIn")?.addEventListener("change", e => { f.enableLightbox = e.target.checked; syncAndRender(); });

      document.getElementById("secReqPassIn")?.addEventListener("change", e => {
        getStudioSec().requirePassphrase = e.target.checked;
        saveDraft();
      });
      document.getElementById("secLocalOnlyIn")?.addEventListener("change", e => {
        getStudioSec().localOnly = e.target.checked;
        saveDraft();
      });
      document.getElementById("secUpdatePassBtn")?.addEventListener("click", async () => {
        const val = document.getElementById("secNewPassIn")?.value || "";
        const statusEl = document.getElementById("secPassStatus");
        if (val.length < 8) {
          if (statusEl) { statusEl.style.color = "#991b1b"; statusEl.textContent = "Passphrase must be at least 8 characters."; }
          return;
        }
        const hash = await sha256Hex(val);
        if (!hash) {
          if (statusEl) { statusEl.style.color = "#991b1b"; statusEl.textContent = "Web Crypto unavailable in this browser context."; }
          return;
        }
        getStudioSec().passphraseHash = hash;
        sessionStorage.setItem(UNLOCK_KEY, hash);
        saveDraft();
        document.getElementById("secNewPassIn").value = "";
        if (statusEl) { statusEl.style.color = "#1e4d3b"; statusEl.textContent = "Hash updated! Download portfolio-config.json to persist on GitHub."; }
      });
      document.getElementById("secLockNowBtn")?.addEventListener("click", () => {
        sessionStorage.removeItem(UNLOCK_KEY);
        toggleStudio(false);
      });

      document.getElementById("cmsExportJsonBtn")?.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "portfolio-config.json";
        a.click();
      });

      document.getElementById("cmsCopyJsonBtn")?.addEventListener("click", async () => {
        await navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
        const btn = document.getElementById("cmsCopyJsonBtn");
        if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "Copy JSON"; }, 1400); }
      });

      document.getElementById("cmsImportFile")?.addEventListener("change", async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          if (parsed && parsed.sections && parsed.systemSettings) {
            config = parsed;
            syncAndRender();
          }
        } catch (_) {
          alert("Invalid portfolio-config.json file.");
        }
      });

      document.getElementById("cmsResetBtn")?.addEventListener("click", () => {
        if (!confirm("Reset all sections, layouts, and tokens back to default?")) return;
        localStorage.removeItem(STORAGE_KEY);
        config = deepClone(window.DEFAULT_PORTFOLIO_CONFIG);
        syncAndRender();
      });
    }
  }

  function openAuthModal() {
    const modal = document.getElementById("cmsAuthModal");
    const errEl = document.getElementById("cmsAuthError");
    const inp = document.getElementById("cmsAuthInput");
    if (!modal) return;
    if (errEl) errEl.textContent = "";
    if (inp) inp.value = "";
    modal.classList.add("open");
    setTimeout(() => inp?.focus(), 40);
  }

  function closeAuthModal() {
    document.getElementById("cmsAuthModal")?.classList.remove("open");
  }

  function toggleStudio(forceState) {
    const wantOpen = typeof forceState === "boolean" ? forceState : !studioOpen;
    if (wantOpen) {
      const sec = getStudioSec();
      if (sec.localOnly && !isLocalHost()) return;
      if (!isStudioUnlocked()) {
        openAuthModal();
        return;
      }
    }
    studioOpen = wantOpen;
    const drawer = document.getElementById("cmsStudioDrawer");
    if (drawer) drawer.classList.toggle("open", studioOpen);
    if (studioOpen) renderStudioBody();
  }

  function initStudioEvents() {
    document.querySelectorAll(".cms-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeStudioTab = btn.dataset.tab;
        renderStudioBody();
      });
    });
    document.getElementById("cmsCloseBtn")?.addEventListener("click", () => toggleStudio(false));
    document.getElementById("cmsAuthCancel")?.addEventListener("click", closeAuthModal);

    document.getElementById("cmsAuthForm")?.addEventListener("submit", async e => {
      e.preventDefault();
      const errEl = document.getElementById("cmsAuthError");
      const inp = document.getElementById("cmsAuthInput");
      let lockState = { fails: 0, until: 0 };
      try { lockState = JSON.parse(sessionStorage.getItem(LOCKOUT_KEY) || "{}"); } catch (_) {}
      const now = Date.now();
      if (lockState.until && now < lockState.until) {
        const secs = Math.ceil((lockState.until - now) / 1000);
        if (errEl) errEl.textContent = `Too many failed attempts. Try again in ${secs}s.`;
        return;
      }
      const hash = await sha256Hex(inp?.value || "");
      const sec = getStudioSec();
      if (hash && hash === sec.passphraseHash) {
        sessionStorage.removeItem(LOCKOUT_KEY);
        sessionStorage.setItem(UNLOCK_KEY, hash);
        closeAuthModal();
        document.getElementById("cmsLauncherPill")?.classList.remove("hidden");
        toggleStudio(true);
      } else {
        const fails = (lockState.fails || 0) + 1;
        const until = fails >= 5 ? now + 60000 : 0;
        sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify({ fails: fails >= 5 ? 0 : fails, until }));
        if (errEl) errEl.textContent = fails >= 5 ? "Locked for 60s after 5 failed attempts." : `Invalid passphrase (${fails}/5).`;
      }
    });

    document.addEventListener("keydown", e => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        toggleStudio();
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get("edit") === "1") {
      if (!getStudioSec().localOnly || isLocalHost()) {
        if (isStudioUnlocked()) document.getElementById("cmsLauncherPill")?.classList.remove("hidden");
        toggleStudio(true);
      }
    }
    document.getElementById("cmsLauncherPill")?.addEventListener("click", () => toggleStudio());
  }

  (async function boot() {
    await loadConfig();
    renderPortfolio();
    initStudioEvents();
  })();
})();
