/*
=====================================================
js/agendamento.js
Lógica do Formulário de Agendamento de Serviços
=====================================================
*/

/*
====================================
1. ESTADO GLOBAL E REFERÊNCIAS DO DOM
====================================
*/
const FORM_STATE = {
  step: 1,
  selectedService: null,
  selectedBarber: null,
  selectedDate: null,
  selectedDuration: 0,
  selectedTime: null,
  clientName: "",
  clientPhone: "",
};

const form = document.getElementById("agendamento-form");
const stepElements = document.querySelectorAll(".step-agendamento");
const servicosList = document.getElementById("servicos-list");
const barbeirosList = document.getElementById("barbeiros-list");
const dataInput = document.getElementById("data-agendamento");
const timeSlotsContainer = document.getElementById("time-slots-container");
const currentStepNumber = document.getElementById("current-step-number");

/*
====================================
2. FUNÇÕES DE NAVEGAÇÃO ENTRE PASSOS
====================================
*/

/**
 * Altera a visualização entre os 3 passos do formulário.
 * @param {number} newStep O número do passo (1, 2 ou 3).
 */
function changeStep(newStep) {
  if (newStep < 1 || newStep > 3) return;

  // Oculta todos e exibe o novo passo
  stepElements.forEach((step) => step.classList.remove("active"));
  const targetStep = document.querySelector(`[data-step="${newStep}"]`);
  if (targetStep) {
    targetStep.classList.add("active");
    FORM_STATE.step = newStep;
    currentStepNumber.textContent = newStep; // Atualiza o número do passo
    window.scrollTo(0, 0);

    // Ações específicas ao entrar em um passo
    if (newStep === 2) {
      // Garante que o input de data está configurado
      setupDateInput();
    } else if (newStep === 3) {
      // Limpa e recalcula horários ao entrar no passo 3
      renderTimeSlots();
    }
  }
}

/*
====================================
3. CARREGAMENTO DE DADOS (FIRESTORE)
====================================
*/

/**
 * Carrega Serviços do Firestore e renderiza no Passo 1.
 */
async function loadAndRenderServices() {
  try {
    const servicesSnapshot = await db.collection("services").get();
    if (servicesSnapshot.empty) {
      servicosList.innerHTML =
        '<p class="error-message">Nenhum serviço cadastrado.</p>';
      return;
    }

    servicosList.innerHTML = "";
    servicesSnapshot.forEach((doc) => {
      const service = doc.data();
      // id do documento (Firestore) é vital para guardar no FORM_STATE
      const serviceId = doc.id;

      const html = `
                <label class="service-card">
                    <input type="radio" name="service" value="${serviceId}" 
                           data-duration="${service.duration}" 
                           required>
                    <span>${service.name} <small>R$ ${
        service.price ? service.price.toFixed(2) : "N/A"
      }</small></span>
                </label>
            `;
      servicosList.innerHTML += html;
    });
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
    servicosList.innerHTML =
      '<p class="error-message">Erro ao carregar. Tente novamente.</p>';
    Swal.fire("Erro", "Não foi possível conectar aos serviços.", "error");
  }
}

/**
 * Carrega Barbeiros do Firestore e renderiza no Passo 2.
 */
async function loadAndRenderBarbers() {
  try {
    const barbersSnapshot = await db.collection("barbers").get();
    if (barbersSnapshot.empty) {
      barbeirosList.innerHTML =
        '<p class="error-message">Nenhum barbeiro cadastrado.</p>';
      return;
    }

    barbeirosList.innerHTML = "";
    barbersSnapshot.forEach((doc) => {
      const barber = doc.data();
      const barberId = doc.id;

      // Stringify the barber data and escape it for the HTML attribute
      const barberDataString = JSON.stringify(barber).replace(/"/g, "&quot;");

      const html = `
                <label class="barber-card service-card">
                    <input type="radio" name="barber" value="${barberId}" data-barber="${barberDataString}" required>
                    <span>${barber.name} <small>Horário: ${barber.workingHoursStart}:00 - ${barber.workingHoursEnd}:00</small></span>
                </label>
            `;
      barbeirosList.innerHTML += html;
    });
  } catch (error) {
    console.error("Erro ao carregar barbeiros:", error);
    barbeirosList.innerHTML =
      '<p class="error-message">Erro ao carregar barbeiros. Tente novamente.</p>';
  }
}

/**
 * Configura o campo de data para aceitar apenas a data de hoje ou futuras.
 */
function setupDateInput() {
  if (dataInput) {
    const today = new Date().toISOString().split("T")[0];
    dataInput.min = today;
  }
}

/*
====================================
4. LÓGICA DE DISPONIBILIDADE DE HORÁRIOS
====================================
*/

/**
 * Calcula e renderiza os horários disponíveis com base nas seleções.
 */
async function renderTimeSlots() {
  timeSlotsContainer.innerHTML = "<p>Calculando horários disponíveis...</p>";

  // Requisito: todos os passos anteriores devem estar preenchidos
  if (
    !FORM_STATE.selectedBarber ||
    !FORM_STATE.selectedDate ||
    FORM_STATE.selectedDuration <= 0
  ) {
    timeSlotsContainer.innerHTML =
      '<p class="error-message">Selecione Barbeiro, Serviço e Data.</p>';
    return;
  }

  // 1. Otimização do Firestore: Criar a chave composta de consulta
  const dateKey = FORM_STATE.selectedDate; // Formato YYYY-MM-DD
  const barberId = FORM_STATE.selectedBarber.id;
  const combinedKey = `${barberId}_${dateKey}`; // Ex: b1_2025-11-06

  // 2. BUSCA NO FIRESTORE: Pega TODOS os agendamentos do barbeiro na data selecionada
  // Nota: Esta consulta exige que você crie um ÍNDICE no Firestore para o campo 'barberId_date'.
  try {
    const appointmentsSnapshot = await db
      .collection("appointments")
      .where("barberId_date", "==", combinedKey)
      .get();

    const bookedSlots = appointmentsSnapshot.docs.map((doc) => ({
      start: doc.data().startTime.toDate(), // Converte Firestore Timestamp para Date
      end: doc.data().endTime.toDate(),
    }));

    // 3. CÁLCULO DE SLOTS: Lógica pesada de checagem de sobreposição (no Front-end)
    const availableSlots = calculateAvailableSlots(
      FORM_STATE.selectedBarber,
      FORM_STATE.selectedDate,
      FORM_STATE.selectedDuration,
      bookedSlots
    );

    // 4. Renderização
    timeSlotsContainer.innerHTML = "";
    if (availableSlots.length === 0) {
      timeSlotsContainer.innerHTML =
        '<p class="error-message">Nenhum horário disponível nesta data. Tente outro dia.</p>';
      return;
    }

    availableSlots.forEach((slot) => {
      const timeStr = slot.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const html = `
                <input type="radio" id="time-${slot.getTime()}" name="time" value="${slot.toISOString()}" class="time-slot-input" required>
                <label for="time-${slot.getTime()}">${timeStr}</label>
            `;
      timeSlotsContainer.innerHTML += html;
    });
  } catch (error) {
    console.error("Erro ao calcular horários:", error);
    timeSlotsContainer.innerHTML =
      '<p class="error-message">Erro ao carregar horários. Verifique o índice do Firestore.</p>';
  }
}

/**
 * Lógica pura para calcular horários disponíveis com base nos agendamentos.
 */
function calculateAvailableSlots(
  barber,
  dateStr,
  durationMinutes,
  bookedSlots
) {
  const slots = [];

  //====================================================================
  // Converte horas de trabalho para minutos (para simplificar a lógica)
  //====================================================================

  const startHour = barber.workingHoursStart || 9; // Default 9h
  const endHour = barber.workingHoursEnd || 18; // Default 18h
  const interval = 15; // Intervalo de 15 minutos para testar

  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);

  // Loop de agendamentos dentro do horário de trabalho
  for (let currentHour = startHour; currentHour < endHour; currentHour++) {
    for (let currentMinute = 0; currentMinute < 60; currentMinute += interval) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(currentHour, currentMinute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Garante que o slot não ultrapasse o final do dia
      if (
        slotEnd.getHours() > endHour ||
        (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)
      ) {
        continue;
      }

      let isOverlap = false;

      // Checa sobreposição com agendamentos já existentes
      for (const booked of bookedSlots) {
        if (
          booked.start.getTime() < slotEnd.getTime() &&
          booked.end.getTime() > slotStart.getTime()
        ) {
          isOverlap = true;
          break;
        }
      }

      if (!isOverlap) {
        slots.push(slotStart);
      }
    }
  }
  return slots;
}

/*
====================================
5. FINALIZAÇÃO E SUBMISSÃO DO FORMULÁRIO
====================================
*/

/**
 * Prepara e salva o objeto de agendamento no Firestore.
 */
async function saveAppointment() {
  // 1. Prepara o objeto de agendamento
  const appointmentData = {
    clientName: FORM_STATE.clientName,
    clientPhone: FORM_STATE.clientPhone,
    serviceId: FORM_STATE.selectedService.id, // Mantido para referência
    serviceName: FORM_STATE.selectedService.name, // Adicionado para exibição
    barberId: FORM_STATE.selectedBarber.id, // Mantido para referência
    barberName: FORM_STATE.selectedBarber.name, // Adicionado para exibição
    startTime: firebase.firestore.Timestamp.fromDate(FORM_STATE.selectedTime),
    endTime: firebase.firestore.Timestamp.fromDate(
      new Date(
        FORM_STATE.selectedTime.getTime() + FORM_STATE.selectedDuration * 60000
      )
    ),
    status: "Confirmed", // Revertido para confirmação automática
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    // CHAVE CRÍTICA PARA O FIRESTORE
    barberId_date: `${FORM_STATE.selectedBarber.id}_${FORM_STATE.selectedDate}`,
  };

  try {
    // 2. Salva no Firestore
    await db.collection("appointments").add(appointmentData);

    // 3. Feedback para o cliente
    Swal.fire({
      title: "Agendamento Confirmado!",
      html: `Seu horário para as **${FORM_STATE.selectedTime.toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit" }
      )}** com o barbeiro **${
        FORM_STATE.selectedBarber.name
      }** foi confirmado com sucesso!`,
      icon: "success",
      confirmButtonText: "Fechar",
    }).then(() => {
      // Reinicia o formulário
      form.reset();
      changeStep(1);
    });
  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    Swal.fire(
      "Erro",
      "Não foi possível confirmar o agendamento. Tente novamente.",
      "error"
    );
  }
}

/*
====================================
6. INICIALIZAÇÃO E EVENT LISTENERS
====================================
*/

document.addEventListener("DOMContentLoaded", () => {
  // Carrega os dados iniciais do Firestore
  loadAndRenderServices();
  loadAndRenderBarbers();

  // 1. LISTENERS para Salvar o Estado do Formulário
  servicosList.addEventListener("change", (event) => {
    const input = event.target;
    if (input.name === "service") {
      const duration = parseInt(input.getAttribute("data-duration"));
      FORM_STATE.selectedService = {
        id: input.value,
        name: input.parentElement
          .querySelector("span")
          .textContent.split(" ")[0],
      };
      FORM_STATE.selectedDuration = duration;

      // Habilita o botão do passo 1 após a seleção
      document.querySelector('[data-step="1"] .btn-next-step').disabled = false;
    }
  });

  barbeirosList.addEventListener("change", (event) => {
    const input = event.target;
    if (input.name === "barber") {
      // Busca os dados completos do barbeiro para salvar no estado
      const barberData = JSON.parse(input.getAttribute("data-barber"));

      FORM_STATE.selectedBarber = {
        id: input.value,
        name: barberData.name,
        workingHoursStart: barberData.workingHoursStart,
        workingHoursEnd: barberData.workingHoursEnd,
      };

      // Habilita o botão do passo 2 se a data também estiver selecionada
      if (FORM_STATE.selectedDate) {
        document.querySelector(
          '[data-step="2"] .btn-next-step'
        ).disabled = false;
      }
    }
  });

  dataInput.addEventListener("change", (event) => {
    FORM_STATE.selectedDate = event.target.value; // YYYY-MM-DD

    // Habilita o botão do passo 2 se o barbeiro também estiver selecionado
    if (FORM_STATE.selectedBarber) {
      document.querySelector('[data-step="2"] .btn-next-step').disabled = false;
    }
    // Ao mudar a data, o Passo 3 será renderizado na navegação
  });

  timeSlotsContainer.addEventListener("change", (event) => {
    if (event.target.name === "time") {
      FORM_STATE.selectedTime = new Date(event.target.value);
    }
  });

  // 2. CONTROLE DA NAVEGAÇÃO
  form.addEventListener("click", (event) => {
    const target = event.target;

    if (target.classList.contains("btn-prev-step")) {
      changeStep(FORM_STATE.step - 1);
    } else if (target.classList.contains("btn-next-step")) {
      const currentStep = document.querySelector(`.step-agendamento.active`);

      // Validação de Preenchimento antes de avançar
      if (currentStep.checkValidity()) {
        if (FORM_STATE.step === 1 && !FORM_STATE.selectedService) {
          Swal.fire(
            "Atenção",
            "Selecione um serviço para continuar.",
            "warning"
          );
          return;
        }
        if (
          FORM_STATE.step === 2 &&
          (!FORM_STATE.selectedBarber || !FORM_STATE.selectedDate)
        ) {
          Swal.fire("Atenção", "Selecione um barbeiro e uma data.", "warning");
          return;
        }

        changeStep(FORM_STATE.step + 1);
      } else {
        currentStep.reportValidity();
      }
    }
  });

  // 3. SUBMISSÃO FINAL
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    FORM_STATE.clientName = document.getElementById("client-name").value;
    FORM_STATE.clientPhone = document.getElementById("client-phone").value;

    // Validação final antes de salvar
    if (!FORM_STATE.selectedTime) {
      Swal.fire("Atenção", "Selecione um horário disponível.", "warning");
      return;
    }
    Swal.fire({
      title: "Confirmar Agendamento",
      icon: "question",
    });

    saveAppointment();
  });
});
