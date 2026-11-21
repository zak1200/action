const $ = (s) => document.querySelector(s);
const services = [
  [
    "id-card",
    "Titre de séjour",
    "Préparez votre première demande, votre renouvellement ou votre changement de statut.",
    "Nous vous aidons à identifier les pièces nécessaires et à préparer votre demande ou votre renouvellement.",
    "Préparer ma demande",
  ],
  [
    "file-badge",
    "Naturalisation",
    "Faites le point sur les étapes de votre projet d’acquisition de la nationalité française.",
    "Faites le point sur votre situation, les justificatifs et les étapes de préparation de votre dossier.",
    "Comprendre les étapes",
  ],
  [
    "users-round",
    "Regroupement familial",
    "Comprenez les démarches pour préparer votre projet de réunification familiale en France.",
    "Un accompagnement dans la constitution du dossier et la compréhension de la procédure auprès de l’OFII.",
    "Préparer mon projet familial",
  ],
  [
    "book-user",
    "DCEM",
    "Préparez les démarches liées aux déplacements de votre enfant mineur.",
    "Préparez la demande de document de circulation pour étranger mineur et les pièces adaptées à votre situation.",
    "Préparer un DCEM",
  ],
  [
    "car-front",
    "Permis de conduire",
    "Faites le point sur les conditions et les étapes de l’échange de votre permis étranger.",
    "Vérification des conditions et accompagnement dans la constitution de votre demande d’échange.",
    "Comprendre l’échange de permis",
  ],
  [
    "scale",
    "OQTF et orientation",
    "Comprenez votre situation et identifiez les démarches et les interlocuteurs adaptés.",
    "Les délais de recours peuvent être courts. Prenez rapidement contact avec un avocat ou une association compétente. Ce service ne remplace pas une consultation juridique.",
    "Trouver la bonne orientation",
  ],
];
// Vendored Lucide SVGs: no runtime library, remote request or decorative glyphs.
const uiIcon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="assets/icons.svg#${name}"></use></svg>`;
document.querySelectorAll("[data-ui-icon]").forEach((el) => {
  el.innerHTML = uiIcon(el.dataset.uiIcon);
});
const icons = {
  tiktok:
    '<path d="M15 3v12a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V3h3c0 3 2 5 5 5v3a8 8 0 0 1-5-2"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7"/>',
  whatsapp:
    '<path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-4.3A8.5 8.5 0 1 1 20 11.5Z"/><path d="M8 7c-2 4 3 8 7 8l1-2-3-1-1 1-2-2 1-1-1-3Z"/>',
};
document.querySelectorAll("[data-icon]").forEach((el) => {
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[el.dataset.icon]}</svg>`;
});
services.forEach(([icon, title, desc, detail, label], index) => {
  const card = document.createElement("article");
  card.className = "service-card";
  card.innerHTML = `<span class="service-icon">${uiIcon(icon)}</span><div class="service-body"><h3><button class="service-open" aria-describedby="service-description-${index}" aria-haspopup="dialog">${title}</button></h3><p id="service-description-${index}">${desc}</p><span class="card-bottom" aria-hidden="true">${label}${uiIcon("arrow-right")}</span></div>`;
  card.querySelector("button").addEventListener("click", () => {
    infoContent.replaceChildren();
    const emblem = document.createElement("span");
    emblem.className = "service-icon";
    emblem.innerHTML = uiIcon(icon);
    const h = document.createElement("h2");
    h.id = "info-title";
    h.textContent = title;
    const p = document.createElement("p");
    p.textContent = detail;
    const b = document.createElement("button");
    b.className = "button";
    b.textContent = "Parler de cette démarche →";
    b.onclick = () => {
      closeDialog(info);
      openBooking(title);
    };
    infoContent.append(emblem, h, p, b);
    showDialog(info);
  });
  $("#services-grid").append(card);
  const option = document.createElement("option");
  option.textContent = title;
  $("#booking-service").append(option);
});
const other = document.createElement("option");
other.textContent = "Autre demande";
$("#booking-service").append(other);
const booking = $("#booking-dialog"),
  info = $("#info-dialog"),
  infoContent = $("#info-content");
function showDialog(dialog) {
  dialog.showModal();
  document.body.classList.add("modal-open");
}
function closeDialog(dialog) {
  dialog.close();
}
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]"))
      document.body.classList.remove("modal-open");
  });
  d.querySelector("[data-close]").onclick = () => closeDialog(d);
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        closeDialog(d);
    }
  });
});
const menuToggle = $(".menu-toggle"),
  navigation = $("#navigation");
function closeMenu() {
  navigation.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Ouvrir le menu");
}
menuToggle.onclick = () => {
  const open = navigation.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute(
    "aria-label",
    open ? "Fermer le menu" : "Ouvrir le menu",
  );
};
document
  .querySelectorAll("nav a, nav [data-book]")
  .forEach((a) => a.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && navigation.classList.contains("open")) {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".site-header")) closeMenu();
});
matchMedia("(min-width:901px)").addEventListener("change", (e) => {
  if (e.matches) closeMenu();
});
$("#load-map").onclick = () => {
  const frame = document.createElement("iframe");
  frame.src =
    "https://www.google.com/maps?q=14+Boulevard+Charles+Nedelec+13001+Marseille&output=embed";
  frame.title = "Emplacement Action Étrangers à Marseille";
  frame.loading = "lazy";
  frame.referrerPolicy = "no-referrer";
  $("#map-wrap").replaceChildren(frame);
};
document.querySelectorAll("[data-video]").forEach(
  (button) =>
    (button.onclick = () => {
      const id = button.dataset.video;
      const art = button.closest(".video-art");
      const frame = document.createElement("iframe");
      frame.src = `https://www.tiktok.com/player/v1/${id}?autoplay=0`;
      frame.title = "Vidéo TikTok Action Étrangers";
      frame.className = "embed-frame";
      frame.allow = "fullscreen";
      frame.referrerPolicy = "no-referrer";
      art.style.padding = "0";
      art.replaceChildren(frame);
      const link = document.createElement("a");
      link.href = `https://www.tiktok.com/@action.etrangers/video/${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "external-video-link";
      link.textContent = "Si la vidéo ne charge pas, ouvrir sur TikTok →";
      art.after(link);
    }),
);
$("#year").textContent = new Date().getFullYear();

// Pause on hover/focus, outside the viewport, in hidden tabs, or by user choice.
(() => {
  const carousel = document.querySelector(".reviews-carousel");
  if (!carousel) return;
  const track = carousel.querySelector(".reviews-grid");
  const cards = [...track.querySelectorAll(".review-card")];
  const controls = carousel.querySelector(".reviews-controls");
  const toggle = carousel.querySelector(".review-pause");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reduced.matches,
    visible = false,
    hovered = false,
    timer;
  controls.hidden = false;
  const index = () =>
    cards.reduce(
      (best, card, i) =>
        Math.abs(
          card.getBoundingClientRect().left -
            track.getBoundingClientRect().left,
        ) <
        Math.abs(
          cards[best].getBoundingClientRect().left -
            track.getBoundingClientRect().left,
        )
          ? i
          : best,
      0,
    );
  const update = () => {
    document.querySelector("#review-position").textContent = index() + 1;
  };
  const go = (direction) => {
    const current = index();
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    const next =
      direction > 0 && atEnd
        ? 0
        : (current + direction + cards.length) % cards.length;
    track.scrollTo({
      left:
        track.scrollLeft +
        cards[next].getBoundingClientRect().left -
        track.getBoundingClientRect().left -
        4,
      behavior: reduced.matches ? "instant" : "smooth",
    });
  };
  const schedule = () => {
    clearInterval(timer);
    toggle.hidden = reduced.matches;
    toggle.textContent = paused ? "Reprendre" : "Pause";
    toggle.setAttribute(
      "aria-label",
      paused ? "Reprendre le défilement" : "Mettre le défilement en pause",
    );
    if (
      !paused &&
      !reduced.matches &&
      visible &&
      !hovered &&
      !carousel.contains(document.activeElement) &&
      !document.hidden
    )
      timer = setInterval(() => go(1), 6000);
  };
  toggle.addEventListener("click", () => {
    paused = !paused;
    schedule();
  });
  carousel.querySelector(".review-prev").addEventListener("click", () => {
    paused = true;
    go(-1);
    schedule();
  });
  carousel.querySelector(".review-next").addEventListener("click", () => {
    paused = true;
    go(1);
    schedule();
  });
  track.addEventListener("scroll", update, { passive: true });
  track.addEventListener("pointerdown", () => {
    paused = true;
    schedule();
  });
  track.addEventListener("keydown", (event) => {
    if (
      event.target === track &&
      ["ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      paused = true;
      go(event.key === "ArrowRight" ? 1 : -1);
      schedule();
    }
  });
  carousel.addEventListener("pointerenter", () => {
    hovered = true;
    schedule();
  });
  carousel.addEventListener("pointerleave", () => {
    hovered = false;
    schedule();
  });
  carousel.addEventListener("focusin", schedule);
  carousel.addEventListener("focusout", () => setTimeout(schedule, 0));
  document.addEventListener("visibilitychange", schedule);
  reduced.addEventListener("change", () => {
    paused = reduced.matches || paused;
    schedule();
  });
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    },
    { threshold: 0.3 },
  ).observe(carousel);
  schedule();
})();
