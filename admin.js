const adminMessage = $("#admin-message");
let adminOffset = 0;
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
}
async function adminAction(button, callback) {
  button.disabled = true;
  adminMessage.textContent = "";
  try {
    await callback();
  } catch (error) {
    adminMessage.textContent = error.message;
    if (error.status === 401) {
      $("#admin-dashboard").hidden = true;
      $("#admin-login").hidden = false;
    }
  } finally {
    if (!["admin-prev", "admin-next"].includes(button.id))
      button.disabled = false;
  }
}
async function renderAdmin() {
  adminMessage.textContent = "";
  try {
    const state = await session();
    $("#admin-login").hidden = state.authenticated;
    $("#admin-dashboard").hidden = !state.authenticated;
    $("#request-code").disabled = !state.email_ready;
    if (!state.email_ready)
      adminMessage.textContent =
        "La connexion par email sera disponible après configuration de la messagerie de l’agence.";
    $("#admin-environment").textContent =
      state.mode === "test"
        ? "Environnement de test · Aucun débit réel"
        : "Compte Stripe en production";
    if (!state.authenticated) return;
    await loadBookings();
  } catch (error) {
    $("#admin-dashboard").hidden = true;
    $("#admin-login").hidden = false;
    adminMessage.textContent = error.message;
  }
}
const statusLabels = {
  pending: "Paiement en attente",
  confirmed: "Confirmé",
  expired: "Expiré",
  cancelled: "Annulé",
  failed: "Échec du paiement",
};
const paymentLabels = {
  unpaid: "Non payé",
  paid: "Payé · 10 €",
  refunded: "Remboursé",
  partially_refunded: "Remboursé en partie",
};
async function loadBookings() {
  const from = $("#admin-from").value,
    to = $("#admin-to").value;
  const data = await api(
    `admin-bookings&from=${from}&to=${to}&offset=${adminOffset}`,
  );
  $("#booking-count").textContent = data.total;
  $("#admin-pagination").textContent = data.total
    ? `${adminOffset + 1}–${adminOffset + data.items.length} sur ${data.total}`
    : "Aucun rendez-vous sur cette période";
  $("#admin-prev").disabled = adminOffset === 0;
  $("#admin-next").disabled = adminOffset + 100 >= data.total;
  const list = $("#bookings-list");
  list.replaceChildren();
  if (!data.items.length)
    list.append(
      node("p", "Aucun rendez-vous pour cette période.", "admin-empty"),
    );
  for (const item of data.items) {
    const row = node("article", "", "booking-record");
    const heading = node("div", "", "booking-record-head");
    const date = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(new Date(item.starts_at * 1000));
    heading.append(
      node("h3", date),
      node("span", statusLabels[item.status] || item.status, "status-badge"),
    );
    const contact = node("div", "", "booking-contact");
    contact.append(node("strong", item.name));
    const email = node("a", item.email);
    email.href = `mailto:${item.email}`;
    const phone = node("a", item.phone);
    phone.href = `tel:${item.phone}`;
    contact.append(email, phone);
    const detail = node("details");
    detail.append(node("summary", "Détails et suivi des emails"));
    detail.append(node("p", item.description || "Aucune description ajoutée."));
    detail.append(node("small", `Référence : ${item.id}`));
    for (const notification of item.notifications)
      detail.append(
        node(
          "p",
          `${notification.kind === "cancelled" ? "Annulation" : "Confirmation"} → ${notification.recipient} : ${notification.sent_at ? "envoyée" : notification.last_error ? "échec — à relancer" : "en attente d’envoi"}`,
          "notification-status",
        ),
      );
    if (item.status === "pending" && !item.checkout_id)
      detail.append(
        node(
          "p",
          "Session Stripe à rapprocher : conserver le créneau bloqué jusqu’à vérification dans Stripe.",
          "error",
        ),
      );
    const actions = node("div", "", "booking-actions");
    actions.append(
      node("span", paymentLabels[item.payment_status] || item.payment_status),
    );
    if (item.stripe_url) {
      const link = node("a", "Voir le paiement Stripe ↗", "text-link");
      link.href = item.stripe_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      actions.append(link);
    }
    if (item.notifications.some((n) => !n.sent_at)) {
      const retry = node(
        "button",
        "Relancer les emails",
        "button small secondary",
      );
      retry.onclick = () =>
        adminAction(retry, async () => {
          await api("retry-mail", { id: item.id });
          await loadBookings();
        });
      actions.append(retry);
    }
    if (item.status === "confirmed") {
      const cancel = node(
        "button",
        "Annuler le rendez-vous",
        "button small secondary",
      );
      cancel.onclick = () => {
        if (
          confirm(
            "Annuler ce rendez-vous et prévenir les deux parties par email ? Cette action ne rembourse pas le paiement Stripe.",
          )
        )
          adminAction(cancel, async () => {
            await api("cancel", { id: item.id });
            await loadBookings();
          });
      };
      actions.append(cancel);
    }
    row.append(heading, node("p", item.service), contact, detail, actions);
    list.append(row);
  }
  const closures = $("#closure-list");
  closures.replaceChildren();
  if (!data.closures.length)
    closures.append(node("p", "Aucune fermeture exceptionnelle."));
  for (const day of data.closures) {
    const row = node("div", "", "closure-row"),
      button = node("button", "Rouvrir", "button small secondary");
    button.setAttribute("aria-label", `Rouvrir le ${formatDate(day)}`);
    button.onclick = () =>
      adminAction(button, async () => {
        await api("closure", { date: day, closed: false });
        await loadBookings();
      });
    row.append(node("span", formatDate(day)), button);
    closures.append(row);
  }
}
$("#request-code").onclick = (event) =>
  adminAction(event.currentTarget, async () => {
    await session();
    await api("login-request", {});
    $("#code-form").hidden = false;
    adminMessage.textContent =
      "Code envoyé à l’adresse administrateur. Il est valable 10 minutes.";
    $("#admin-code").focus();
  });
$("#code-form").onsubmit = (event) => {
  event.preventDefault();
  adminAction(event.submitter, async () => {
    const result = await api("login-verify", { code: $("#admin-code").value });
    bookingSession.csrf = result.csrf;
    $("#admin-code").value = "";
    await renderAdmin();
  });
};
$("#admin-logout").onclick = (event) =>
  adminAction(event.currentTarget, async () => {
    await api("logout", {});
    $("#bookings-list").replaceChildren();
    $("#code-form").hidden = true;
    await renderAdmin();
  });
$("#admin-filter").onsubmit = (event) => {
  event.preventDefault();
  adminOffset = 0;
  adminAction(event.submitter, loadBookings);
};
$("#admin-prev").onclick = (event) => {
  adminOffset = Math.max(0, adminOffset - 100);
  adminAction(event.currentTarget, loadBookings);
};
$("#admin-next").onclick = (event) => {
  adminOffset += 100;
  adminAction(event.currentTarget, loadBookings);
};
$("#closure-form").onsubmit = (event) => {
  event.preventDefault();
  adminAction(event.submitter, async () => {
    await api("closure", { date: $("#closure-date").value, closed: true });
    await loadBookings();
  });
};
$("#admin-from").value = parisDate();
const monthEnd = new Date();
monthEnd.setUTCDate(monthEnd.getUTCDate() + 30);
$("#admin-to").value = parisDate(monthEnd);
function route() {
  const isAdmin = location.hash === "#admin",
    wasAdmin = !$("#admin-view").hidden;
  $("#public-view").hidden = isAdmin;
  $("#admin-view").hidden = !isAdmin;
  document.querySelector('aside[aria-label="Contact rapide"]').hidden = isAdmin;
  if (isAdmin) {
    renderAdmin();
    $("#admin-title").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (wasAdmin) $("#main").focus({ preventScroll: true });
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === location.hash) a.setAttribute("aria-current", "location");
    else a.removeAttribute("aria-current");
  });
  document.title = isAdmin
    ? "Espace administrateur — Action Étranger"
    : "Action Étrangers — Avançons dans vos démarches";
}
window.addEventListener("hashchange", route);
route();
