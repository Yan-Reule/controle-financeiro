const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const driverDays = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo"
];

const financeKey = "controleFinanceiro.lancamentos";
const financeListsKey = "controleFinanceiro.listas";
const driverKey = "controleFinanceiro.motorista";

let financeState = loadFinanceState();
let entries = getActiveList().entries;

function formatMoney(value) {
  return moneyFormatter.format(value);
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function createFinanceList(name = "Nova lista", date = getTodayDate(), listEntries = []) {
  return {
    id: createId(),
    name,
    date,
    entries: listEntries
  };
}

function loadFinanceState() {
  const savedState = parseStoredJson(financeListsKey, null);

  if (savedState?.lists?.length) {
    savedState.lists = savedState.lists.map((list) => ({
      id: list.id || createId(),
      name: list.name || "Sem nome",
      date: list.date || getTodayDate(),
      entries: Array.isArray(list.entries) ? list.entries : []
    }));

    savedState.activeListId = savedState.activeListId || savedState.lists[0].id;

    return savedState;
  }

  const oldEntries = parseStoredJson(financeKey, []);
  const firstList = createFinanceList("Lista inicial", getTodayDate(), oldEntries);

  return {
    activeListId: firstList.id,
    lists: [firstList]
  };
}

function getActiveList() {
  let activeList = financeState.lists.find((list) => list.id === financeState.activeListId);

  if (!activeList) {
    activeList = financeState.lists[0] || createFinanceList();
    financeState.lists = financeState.lists.length ? financeState.lists : [activeList];
    financeState.activeListId = activeList.id;
  }

  return activeList;
}

function saveFinance() {
  getActiveList().entries = entries;
  localStorage.setItem(financeListsKey, JSON.stringify(financeState));
}

function saveDriver() {
  const data = {
    settings: {
      precoEtanol: document.getElementById("precoEtanol").value,
      mediaCarro: document.getElementById("mediaCarro").value,
      manutencaoKm: document.getElementById("manutencaoKm").value
    },
    days: driverDays.map((_, index) => ({
      inicio: document.getElementById(`inicio-${index}`).value,
      fim: document.getElementById(`fim-${index}`).value,
      km: document.getElementById(`km-${index}`).value,
      ganho: document.getElementById(`ganho-${index}`).value
    }))
  };

  localStorage.setItem(driverKey, JSON.stringify(data));
}

function setActiveTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === tabId);
  });

  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === tabId);
  });
}

function formatListDate(dateValue) {
  if (!dateValue) return "Sem data";

  const [year, month, day] = dateValue.split("-");
  if (!year || !month || !day) return dateValue;

  return `${day}/${month}/${year}`;
}

function renderFinanceLists() {
  const listContainer = document.getElementById("listasFinanceiras");
  const activeList = getActiveList();
  listContainer.innerHTML = "";

  document.getElementById("nomeLista").value = activeList.name;
  document.getElementById("dataLista").value = activeList.date;
  document.getElementById("listaAtualDescricao").textContent = `${activeList.name} - ${formatListDate(activeList.date)}`;

  financeState.lists.forEach((list) => {
    const button = document.createElement("button");
    const name = document.createElement("strong");
    const date = document.createElement("span");

    button.type = "button";
    button.className = "saved-list-button";
    button.classList.toggle("is-active", list.id === financeState.activeListId);
    button.dataset.listId = list.id;
    name.textContent = list.name || "Sem nome";
    date.textContent = formatListDate(list.date);
    button.append(name, date);
    listContainer.appendChild(button);
  });
}

function openFinanceList(id) {
  saveFinance();
  financeState.activeListId = id;
  entries = getActiveList().entries;
  saveFinance();
  renderFinanceLists();
  renderFinance();
}

function createNewFinanceList() {
  saveFinance();

  const newList = createFinanceList(`Lista ${financeState.lists.length + 1}`, getTodayDate(), []);
  financeState.lists.unshift(newList);
  financeState.activeListId = newList.id;
  entries = newList.entries;
  saveFinance();
  renderFinanceLists();
  renderFinance();
  document.getElementById("nomeLista").focus();
}

function updateActiveListInfo() {
  const activeList = getActiveList();
  activeList.name = document.getElementById("nomeLista").value.trim() || "Sem nome";
  activeList.date = document.getElementById("dataLista").value || getTodayDate();
  saveFinance();
  renderFinanceLists();
}

function addEntry(event) {
  event.preventDefault();

  const descriptionInput = document.getElementById("descricao");
  const typeInput = document.getElementById("tipo");
  const valueInput = document.getElementById("valor");
  const paidInput = document.getElementById("pago");
  const description = descriptionInput.value.trim();
  const value = Number(valueInput.value);

  if (!description) {
    alert("Informe uma descrição.");
    descriptionInput.focus();
    return;
  }

  if (!Number.isFinite(value) || value <= 0) {
    alert("Informe um valor válido.");
    valueInput.focus();
    return;
  }

  entries.push({
    id: createId(),
    description,
    type: typeInput.value,
    value,
    note: "",
    paid: paidInput.checked
  });

  saveFinance();
  event.target.reset();
  typeInput.value = "entrada";
  descriptionInput.focus();
  renderFinance();
}

function removeEntry(id) {
  entries = entries.filter((entry) => String(entry.id) !== String(id));
  saveFinance();
  renderFinance();
}

function updateEntryPaid(id, paid) {
  entries = entries.map((entry) => {
    if (String(entry.id) !== String(id)) return entry;
    return { ...entry, paid };
  });

  saveFinance();
}

function updateEntryNote(id, note) {
  entries = entries.map((entry) => {
    if (String(entry.id) !== String(id)) return entry;
    return { ...entry, note };
  });

  saveFinance();
}

function renderFinance() {
  const tableBody = document.getElementById("tabelaLancamentos");
  tableBody.innerHTML = "";

  const totals = entries.reduce(
    (accumulator, entry) => {
      if (entry.type === "entrada") {
        accumulator.income += entry.value;
      } else {
        accumulator.expenses += entry.value;
      }

      return accumulator;
    },
    { income: 0, expenses: 0 }
  );

  if (!entries.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty-row">Nenhum lançamento cadastrado.</td></tr>';
  } else {
    entries.forEach((entry) => {
      const row = document.createElement("tr");
      const typeLabel = entry.type === "entrada" ? "Entrada" : "Gasto";
      const typeClass = entry.type === "entrada" ? "positive" : "negative";
      const descriptionCell = document.createElement("td");
      const typeCell = document.createElement("td");
      const valueCell = document.createElement("td");
      const paidCell = document.createElement("td");
      const noteCell = document.createElement("td");
      const actionCell = document.createElement("td");
      const paidCheckbox = document.createElement("input");
      const noteInput = document.createElement("input");
      const removeButton = document.createElement("button");

      descriptionCell.textContent = entry.description;
      typeCell.textContent = typeLabel;
      typeCell.className = typeClass;
      valueCell.textContent = formatMoney(entry.value);
      paidCheckbox.type = "checkbox";
      paidCheckbox.checked = Boolean(entry.paid);
      paidCheckbox.dataset.paidEntryId = entry.id;
      paidCheckbox.setAttribute("aria-label", `Marcar ${entry.description} como pago`);
      paidCell.appendChild(paidCheckbox);
      noteInput.type = "text";
      noteInput.value = entry.note || "";
      noteInput.placeholder = "Anotar algo";
      noteInput.dataset.noteEntryId = entry.id;
      noteInput.setAttribute("aria-label", `Observação de ${entry.description}`);
      noteCell.appendChild(noteInput);
      removeButton.className = "danger-action";
      removeButton.type = "button";
      removeButton.dataset.entryId = entry.id;
      removeButton.textContent = "Excluir";
      actionCell.appendChild(removeButton);

      row.append(descriptionCell, typeCell, valueCell, paidCell, noteCell, actionCell);
      tableBody.appendChild(row);
    });
  }

  document.getElementById("totalEntradas").textContent = formatMoney(totals.income);
  document.getElementById("totalGastos").textContent = formatMoney(totals.expenses);
  document.getElementById("saldoFinal").textContent = formatMoney(totals.income - totals.expenses);
}

function createDriverTable() {
  const tableBody = document.getElementById("tabelaDias");

  driverDays.forEach((day, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><strong>${day}</strong></td>
      <td><input type="time" id="inicio-${index}" data-driver-field /></td>
      <td><input type="time" id="fim-${index}" data-driver-field /></td>
      <td class="result-cell" id="horas-${index}">0h</td>
      <td><input type="number" id="km-${index}" placeholder="120" min="0" step="0.1" data-driver-field /></td>
      <td><input type="number" id="ganho-${index}" placeholder="300" min="0" step="0.01" data-driver-field /></td>
      <td class="result-cell" id="combustivel-${index}">R$ 0,00</td>
      <td class="result-cell" id="manutencao-${index}">R$ 0,00</td>
      <td class="result-cell" id="liquido-${index}">R$ 0,00</td>
    `;

    tableBody.appendChild(row);
  });
}

function calculateHours(start, end) {
  if (!start || !end) return 0;

  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  return (endTotal - startTotal) / 60;
}

function calculateDriver() {
  const ethanolPrice = Number(document.getElementById("precoEtanol").value) || 0;
  const carAverage = Number(document.getElementById("mediaCarro").value) || 1;
  const maintenanceByKm = Number(document.getElementById("manutencaoKm").value) || 0;

  let totalHours = 0;
  let totalGross = 0;
  let totalFuel = 0;
  let totalMaintenance = 0;
  let totalNet = 0;

  driverDays.forEach((_, index) => {
    const start = document.getElementById(`inicio-${index}`).value;
    const end = document.getElementById(`fim-${index}`).value;
    const km = Number(document.getElementById(`km-${index}`).value) || 0;
    const gross = Number(document.getElementById(`ganho-${index}`).value) || 0;

    const hours = calculateHours(start, end);
    const fuelCost = (km / carAverage) * ethanolPrice;
    const maintenance = km * maintenanceByKm;
    const net = gross - fuelCost - maintenance;
    const netElement = document.getElementById(`liquido-${index}`);

    document.getElementById(`horas-${index}`).textContent = `${hours.toFixed(1)}h`;
    document.getElementById(`combustivel-${index}`).textContent = formatMoney(fuelCost);
    document.getElementById(`manutencao-${index}`).textContent = formatMoney(maintenance);
    netElement.textContent = formatMoney(net);
    netElement.classList.toggle("negative", net < 0);

    totalHours += hours;
    totalGross += gross;
    totalFuel += fuelCost;
    totalMaintenance += maintenance;
    totalNet += net;
  });

  const totalNetElement = document.getElementById("totalLiquido");

  document.getElementById("totalHoras").textContent = `${totalHours.toFixed(1)}h`;
  document.getElementById("totalBruto").textContent = formatMoney(totalGross);
  document.getElementById("totalCombustivel").textContent = formatMoney(totalFuel);
  document.getElementById("totalManutencao").textContent = formatMoney(totalMaintenance);
  totalNetElement.textContent = formatMoney(totalNet);
  totalNetElement.classList.toggle("negative", totalNet < 0);

  saveDriver();
}

function restoreDriver() {
  const savedData = JSON.parse(localStorage.getItem(driverKey));
  if (!savedData) return;

  document.getElementById("precoEtanol").value = savedData.settings?.precoEtanol ?? "5.00";
  document.getElementById("mediaCarro").value = savedData.settings?.mediaCarro ?? "11";
  document.getElementById("manutencaoKm").value = savedData.settings?.manutencaoKm ?? "0.20";

  savedData.days?.forEach((day, index) => {
    document.getElementById(`inicio-${index}`).value = day.inicio || "";
    document.getElementById(`fim-${index}`).value = day.fim || "";
    document.getElementById(`km-${index}`).value = day.km || "";
    document.getElementById(`ganho-${index}`).value = day.ganho || "";
  });
}

function clearDriver() {
  driverDays.forEach((_, index) => {
    document.getElementById(`inicio-${index}`).value = "";
    document.getElementById(`fim-${index}`).value = "";
    document.getElementById(`km-${index}`).value = "";
    document.getElementById(`ganho-${index}`).value = "";
  });

  calculateDriver();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
});

document.getElementById("formLancamento").addEventListener("submit", addEntry);

document.getElementById("novaLista").addEventListener("click", createNewFinanceList);
document.getElementById("nomeLista").addEventListener("input", updateActiveListInfo);
document.getElementById("dataLista").addEventListener("input", updateActiveListInfo);

document.getElementById("listasFinanceiras").addEventListener("click", (event) => {
  const button = event.target.closest("[data-list-id]");
  if (button) openFinanceList(button.dataset.listId);
});

document.getElementById("tabelaLancamentos").addEventListener("click", (event) => {
  const button = event.target.closest("[data-entry-id]");
  if (button) removeEntry(button.dataset.entryId);
});

document.getElementById("tabelaLancamentos").addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-paid-entry-id]");
  if (checkbox) updateEntryPaid(checkbox.dataset.paidEntryId, checkbox.checked);
});

document.getElementById("tabelaLancamentos").addEventListener("input", (event) => {
  const noteInput = event.target.closest("[data-note-entry-id]");
  if (noteInput) updateEntryNote(noteInput.dataset.noteEntryId, noteInput.value);
});

document.getElementById("limparMotorista").addEventListener("click", clearDriver);
document.getElementById("motorista").addEventListener("input", (event) => {
  if (event.target.matches("input")) calculateDriver();
});

createDriverTable();
restoreDriver();
renderFinanceLists();
renderFinance();
calculateDriver();
