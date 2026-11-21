// Booking state comes from the server. Prices and availability are never trusted from this browser.
let bookingSession;
async function api(action, data, headers = {}) {
  const response = await fetch(`api/index.php?action=${action}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...(data ? { method: "POST", body: JSON.stringify(data) } : {}),
    headers: {
      ...(data
        ? {
            "Content-Type": "application/json",
            "X-CSRF-Token": bookingSession?.csrf || "",
          }
        : {}),
      ...headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "La réservation en ligne est indisponible. Appelez le 06 10 10 25 91.",
    );
  }
  if (!response.ok) {
    const error = new Error(result.error || "Le service est indisponible.");
    error.status = response.status;
    throw error;
  }
  return result;
}
async function session() {
  bookingSession = await api("session");
  const test = bookingSession.mode === "test";
  $(".demo-bar").textContent = test
    ? "Version de test · Aucun débit réel · Utilisez des données fictives"
    : "Action Étranger · Accompagnement administratif indépendant";
  $("#booking-mode").textContent = test
    ? "Mode test : utilisez des coordonnées fictives et une carte de test Stripe."
    : "Paiement sécurisé par Stripe. Votre créneau est confirmé après validation du paiement.";
  $(".footer-bottom > span:last-child").textContent = test
    ? "Préversion · Paiements en mode test"
    : "Service privé indépendant de l’administration";
  return bookingSession;
}
function parisDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function formatDate(day) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(`${day}T12:00:00Z`));
}
const form = $("#booking-form"),
  dateInput = $("#booking-date"),
  timeInput = $("#booking-time");
let requestKey,
  availabilitySequence = 0,
  submitting = false;
function setupDates() {
  dateInput.min = parisDate();
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 60);
  dateInput.max = parisDate(end);
}
function validDate(day) {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    day >= dateInput.min &&
    day <= dateInput.max &&
    weekday !== 0 &&
    weekday !== 6
  );
}
async function updateTimes() {
  const sequence = ++availabilitySequence,
    day = dateInput.value;
  timeInput.replaceChildren(new Option("Choisir un créneau", ""));
  timeInput.disabled = true;
  dateInput.setCustomValidity("");
  $("#date-error").textContent = "";
  if (!day) return;
  if (!validDate(day)) {
    const message =
      "Choisissez un jour du lundi au vendredi, dans les 60 prochains jours.";
    dateInput.setCustomValidity(message);
    $("#date-error").textContent = message;
    return;
  }
  $("#date-error").textContent = "Recherche des disponibilités…";
  try {
    const result = await api(`availability&date=${encodeURIComponent(day)}`);
    if (sequence !== availabilitySequence) return;
    result.times.forEach((time) => timeInput.append(new Option(time, time)));
    $("#date-error").textContent = result.times.length
      ? ""
      : "Aucun créneau disponible ce jour. Choisissez une autre date.";
    timeInput.disabled = !result.times.length;
  } catch (error) {
    if (sequence === availabilitySequence)
      $("#date-error").textContent = error.message;
  }
}
async function openBooking(service = "") {
  booking.setAttribute("aria-labelledby", "booking-title");
  $("#booking-content").hidden = false;
  $("#booking-success")?.remove();
  form.reset();
  $("#booking-service").value = service;
  $("#booking-error").textContent = "";
  requestKey = crypto.randomUUID();
  setupDates();
  updateTimes();
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  if (!booking.open) showDialog(booking);
  try {
    const state = await session();
    if (!state.enabled)
      throw new Error(
        "Les réservations en ligne ouvrent prochainement. Appelez-nous au 06 10 10 25 91.",
      );
    button.disabled = false;
  } catch (error) {
    $("#booking-error").textContent = error.message;
  }
}
document
  .querySelectorAll("[data-book]")
  .forEach((button) => button.addEventListener("click", () => openBooking()));
dateInput.addEventListener("input", () => {
  requestKey = crypto.randomUUID();
  updateTimes();
});
form.addEventListener("input", () => {
  if (!submitting) requestKey = crypto.randomUUID();
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting || !form.reportValidity()) return;
  submitting = true;
  const button = form.querySelector("[type=submit]");
  button.disabled = true;
  button.textContent = "Préparation du paiement…";
  $("#booking-error").textContent = "";
  const data = Object.fromEntries(new FormData(form));
  data.consent = form.elements.consent.checked;
  data.request_key = requestKey;
  try {
    const result = await api("checkout", data);
    sessionStorage.setItem(`action-booking-${result.booking_id}`, result.token);
    if (!result.url)
      throw new Error(
        "Cette demande a déjà été traitée. Consultez son statut ou choisissez un nouveau créneau.",
      );
    const target = new URL(result.url);
    if (
      target.protocol !== "https:" ||
      target.hostname !== "checkout.stripe.com"
    )
      throw new Error("Adresse de paiement inattendue. Contactez-nous.");
    location.assign(target.href);
  } catch (error) {
    $("#booking-error").textContent = error.message;
    if (error.status === 409) {
      requestKey = crypto.randomUUID();
      await updateTimes();
    }
  } finally {
    submitting = false;
    button.disabled = false;
    button.textContent = "Continuer vers le paiement · 10 €";
  }
});
async function bookingReturn() {
  const params = new URLSearchParams(location.search),
    id = params.get("booking");
  if (!id || !/^[a-f0-9]{32}$/.test(id)) return;
  const token = sessionStorage.getItem(`action-booking-${id}`);
  const panel = document.createElement("div");
  panel.id = "booking-success";
  panel.className = "success";
  const title = document.createElement("h2");
  title.id = "booking-success-title";
  title.tabIndex = -1;
  title.textContent = "Vérification de votre rendez-vous";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const detail = document.createElement("p"),
    refresh = document.createElement("button");
  refresh.className = "button";
  refresh.textContent = "Actualiser le statut";
  panel.append(title, status, detail, refresh);
  $("#booking-content").hidden = true;
  booking.append(panel);
  booking.setAttribute("aria-labelledby", title.id);
  showDialog(booking);
  title.focus();
  let timer,
    attempts = 0;
  async function check() {
    clearTimeout(timer);
    refresh.disabled = true;
    try {
      if (!token)
        throw new Error(
          "Ouvrez ce retour de paiement dans le navigateur utilisé pour réserver. Pour toute question, contactez-nous avec votre reçu Stripe.",
        );
      const result = await api(`booking&id=${encodeURIComponent(id)}`, null, {
        "X-Booking-Token": token,
      });
      const labels = {
        confirmed: "Votre rendez-vous est confirmé.",
        pending: "Votre rendez-vous attend la confirmation du paiement.",
        expired:
          "La session de paiement a expiré. Aucun rendez-vous n’est confirmé.",
        cancelled: "Ce rendez-vous a été annulé.",
        failed: "Le paiement a échoué. Vous pouvez choisir un nouveau créneau.",
      };
      title.textContent =
        labels[result.status] || "Statut de votre rendez-vous";
      status.textContent = `${result.service} · ${formatDate(result.date)} à ${result.time} (Paris) · 30 minutes`;
      detail.textContent =
        result.status === "confirmed"
          ? "La confirmation et le fichier calendrier sont en cours d’envoi par email. Pensez à consulter les courriers indésirables."
          : params.has("payment")
            ? "Vous avez quitté le paiement. Le créneau reste temporairement réservé pendant la session Stripe. Aucun paiement n’est confirmé ici."
            : "Cette page se met à jour après vérification par Stripe. Un paiement différé peut prendre plus de temps.";
      if (result.mode === "test")
        detail.textContent = "TEST : aucun débit réel. " + detail.textContent;
      if (result.status === "pending" && ++attempts < 12 && booking.open)
        timer = setTimeout(check, 3000);
    } catch (error) {
      status.textContent = error.message;
    } finally {
      refresh.disabled = false;
    }
  }
  refresh.onclick = check;
  booking.addEventListener("close", () => clearTimeout(timer), { once: true });
  check();
}
$("#legal-open").onclick = () => {
  infoContent.innerHTML =
    '<h2 id="info-title">Réservation et confidentialité</h2><p>Action Étranger est un service privé indépendant de l’administration. Le rendez-vous dure 30 minutes et coûte 10 €. Le paiement est traité sur la page sécurisée de Stripe.</p><p>Votre nom, votre email, votre téléphone, votre démarche et le créneau choisi servent à gérer votre rendez-vous et ses notifications. La description est facultative : ne transmettez aucun document d’identité ni information sensible. Les détails sont accessibles uniquement à l’administrateur authentifié.</p><p>Les cartes et vidéos externes sont chargées après votre clic. Pour toute question concernant vos données ou une réservation, écrivez à contact@action-etranger.fr.</p><p>Cette préversion reste destinée aux essais jusqu’à validation des mentions légales, des durées de conservation et des conditions de réservation par le responsable du site.</p>';
  showDialog(info);
};
setupDates();
session().catch(() => {
  $(".demo-bar").textContent =
    "Préversion · Réservation en ligne en cours de préparation";
});
bookingReturn();
