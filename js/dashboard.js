/*
 =====================================================
js/dashboard.js
Lógica do Painel Administrativo
=====================================================
*/
/*
==================================
0. VERIFICAÇÃO DE AUTENTICAÇÃO
==================================
*/
// Escuta por mudanças no estado de autenticação
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    // O usuário está logado, então inicializa o dashboard
    console.log("Usuário autenticado, inicializando o dashboard.");
    initializeDashboard();
  } else {
    // O usuário não está logado, redireciona para a página de login
    console.log("Nenhum usuário autenticado, redirecionando para o login.");
    window.location.href = "../login.html";
  }
});
// Garante que o código só rode após o DOM estar carregado
function initializeDashboard() {
  /*
  ==================================
  1. REFERÊNCIAS DO DOM
  ==================================
  */
  const appointmentsTbody = document.getElementById("appointments-tbody");
  const todayCountEl = document.getElementById("today-count");
  const pendingCountEl = document.getElementById("pending-count");
  const confirmedCountEl = document.getElementById("confirmed-count");

  // Alerta de novo agendamento
  const newAppointmentAlert = document.getElementById("new-appointment-alert");
  const viewAlertDetailsBtn = document.getElementById("view-alert-details");

  // Referências do Modal (já existentes no HTML)
  const modal = document.getElementById("appointment-modal");
  const modalTitle = document.querySelector(".modal-title");
  const closeModalBtn = document.getElementById("close-modal");
  const detailStatus = document.getElementById("detail-status");
  const detailClient = document.getElementById("detail-client");
  const detailPhone = document.getElementById("detail-phone");
  const detailBarber = document.getElementById("detail-barber");
  const detailService = document.getElementById("detail-service");
  const detailDatetime = document.getElementById("detail-datetime");
  // Removido pois não existem no HTML fornecido
  const deleteBtn = document.getElementById("delete-button");

  /*
  ==================================
  2. ESTADO GLOBAL E CACHE DE DADOS
  ==================================
  */
  let allAppointments = []; // Cache local de todos os agendamentos
  let servicesMap = {}; // Cache para nomes de serviços {id: nome}
  let barbersMap = {}; // Cache para nomes de barbeiros {id: nome}
  let currentEditingAppointmentId = null; // ID do agendamento sendo visto no modal
  let isInitialLoad = true; // Flag para controlar o carregamento inicial

  /*
  ==================================
  2. FUNÇÕES
  ==================================
  */

  /**
   * Formata um objeto Timestamp do Firebase para uma string "dd/mm/yyyy hh:mm".
   * @param {firebase.firestore.Timestamp} timestamp O objeto de data do Firebase.
   * @returns {string} A data formatada.
   */
  function formatFirebaseTimestamp(timestamp) {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Renderiza os agendamentos na tabela e atualiza os contadores.
   */
  function renderAppointments() {
    // Limpa a tabela antes de adicionar novos dados
    appointmentsTbody.innerHTML = "";

    if (allAppointments.length === 0) {
      appointmentsTbody.innerHTML =
        '<tr><td colspan="6" class="empty-row">Nenhum agendamento encontrado.</td></tr>';
      return;
    }

    // Contadores para os cartões de resumo
    let todayCount = 0;
    let pendingCount = 0;
    let confirmedCount = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    allAppointments.forEach((appt) => {
      // Atualiza contadores
      if (appt.startTime.toDate().toISOString().slice(0, 10) === todayStr) {
        todayCount++;
      }
      if (appt.status === "Pending") {
        pendingCount++;
      }
      if (appt.status === "Agendado") {
        confirmedCount++;
      }

      // Cria a linha da tabela
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${appt.clientName}</td>
        <td>${formatFirebaseTimestamp(appt.startTime)}</td>
        <td>${servicesMap[appt.serviceId] || "Não encontrado"}</td>
        <td>${barbersMap[appt.barberId] || "Não encontrado"}</td>
        <td><span class="status-badge ${appt.status.toLowerCase()}">${
        appt.status
      }</span></td>
        <td>
          <button class="action-btn" data-id="${appt.id}" title="Ver Detalhes">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      appointmentsTbody.appendChild(row);
    });

    // Atualiza os valores nos cartões de resumo
    todayCountEl.textContent = todayCount;
    pendingCountEl.textContent = pendingCount;
    confirmedCountEl.textContent = confirmedCount;
  }

  /**
   * Abre o modal com os detalhes de um agendamento específico.
   * @param {string} appointmentId - O ID do documento do agendamento no Firestore.
   */
  function openDetailsModal(appointmentId) {
    const appointment = allAppointments.find(
      (appt) => appt.id === appointmentId
    );
    if (!appointment) {
      console.error("Agendamento não encontrado!");
      return;
    }

    currentEditingAppointmentId = appointmentId;

    // Preenche os campos do modal
    modalTitle.innerHTML = `<i class="fas fa-clock"></i> Detalhes do Agendamento`;
    detailStatus.textContent = appointment.status;
    detailStatus.className = `status-badge ${appointment.status.toLowerCase()}`;
    detailClient.textContent = appointment.clientName;
    detailPhone.textContent = appointment.clientPhone;
    detailBarber.textContent = barbersMap[appointment.barberId] || "N/A";
    detailService.textContent = servicesMap[appointment.serviceId] || "N/A";
    detailDatetime.textContent = formatFirebaseTimestamp(appointment.startTime);

    // O botão de deletar sempre fica visível no modal
    deleteBtn.style.display = "inline-block";

    modal.classList.remove("hidden");
  }

  /**
   * Fecha o modal de detalhes.
   */
  function closeDetailsModal() {
    modal.classList.add("hidden");
    currentEditingAppointmentId = null;
  }

  /**
   * Deleta um agendamento do Firestore.
   */
  async function deleteAppointment() {
    if (!currentEditingAppointmentId) return;

    try {
      await db
        .collection("appointments")
        .doc(currentEditingAppointmentId)
        .delete();

      Swal.fire("Sucesso!", `Agendamento excluído com sucesso.`, "success");
      closeDetailsModal();
      // A tabela será atualizada automaticamente pelo onSnapshot
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      Swal.fire("Erro!", "Não foi possível atualizar o agendamento.", "error");
    }
  }

  /*
  ==================================
  3. LÓGICA DO FIREBASE (EM TEMPO REAL)
  ==================================
  */

  /**
   * Função principal que inicializa o dashboard.
   */
  async function fetchAndListenAppointments() {
    try {
      // 1. Carrega serviços e barbeiros para o cache (mapas)
      const servicesSnapshot = await db.collection("services").get();
      servicesSnapshot.forEach((doc) => {
        servicesMap[doc.id] = doc.data().name;
      });

      const barbersSnapshot = await db.collection("barbers").get();
      barbersSnapshot.forEach((doc) => {
        barbersMap[doc.id] = doc.data().name;
      });

      // 2. Escuta por mudanças na coleção 'appointments' em tempo real
      db.collection("appointments")
        .orderBy("startTime", "desc") // Ordena pelos mais recentes primeiro
        .onSnapshot(
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              const appointmentData = {
                id: change.doc.id,
                ...change.doc.data(),
              };

              if (change.type === "added") {
                // Se não for o carregamento inicial, mostra o alerta
                if (!isInitialLoad) {
                  newAppointmentAlert.classList.remove("hidden");
                  // Adiciona o ID do novo agendamento ao botão "Visualizar"
                  viewAlertDetailsBtn.setAttribute(
                    "data-id",
                    appointmentData.id
                  );
                }
                allAppointments.unshift(appointmentData); // Adiciona no início
              }

              if (change.type === "modified") {
                const index = allAppointments.findIndex(
                  (appt) => appt.id === appointmentData.id
                );
                if (index > -1) allAppointments[index] = appointmentData;
              }

              if (change.type === "removed") {
                allAppointments = allAppointments.filter(
                  (appt) => appt.id !== appointmentData.id
                );
              }
            });

            // Ordena novamente para garantir a ordem correta
            allAppointments.sort(
              (a, b) => b.startTime.toDate() - a.startTime.toDate()
            );
            renderAppointments();

            // Após o primeiro carregamento, desativa a flag
            isInitialLoad = false;
          },
          (error) => {
            console.error("Erro ao buscar agendamentos: ", error);
            appointmentsTbody.innerHTML =
              '<tr><td colspan="6" class="empty-row">Erro ao carregar dados. Verifique o console.</td></tr>';
          }
        );
    } catch (error) {
      console.error("Erro ao inicializar o dashboard:", error);
    }
  }

  /*
  ==================================
  4. EVENT LISTENERS
  ==================================
  */

  // Listener para os botões de ação na tabela
  appointmentsTbody.addEventListener("click", (event) => {
    const actionButton = event.target.closest(".action-btn");
    if (actionButton) {
      const appointmentId = actionButton.dataset.id;
      openDetailsModal(appointmentId);
    }
  });

  // Listener para o botão "Visualizar" do alerta
  viewAlertDetailsBtn.addEventListener("click", () => {
    const newAppointmentId = viewAlertDetailsBtn.getAttribute("data-id");
    if (newAppointmentId) {
      openDetailsModal(newAppointmentId);
      newAppointmentAlert.classList.add("hidden"); // Esconde o alerta após clicar
    }
  });

  // Listeners do modal
  closeModalBtn.addEventListener("click", closeDetailsModal);
  deleteBtn.addEventListener("click", () => {
    // A confirmação já está no outro listener, aqui apenas chamamos a função.
    deleteAppointment();
  });

  // Busca os dados
  fetchAndListenAppointments();
}
/*
  ==================================
  5. Sair do Dashboard
  ==================================
  */
const logoutBtn = document.getElementById("logout-button");
logoutBtn.addEventListener("click", () => {
  Swal.fire({
    title: "Deseja realmente sair?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      // Retorna a pagina de login
      firebase
        .auth()
        .signOut()
        .then(() => {
          window.location.href = "../login.html";
        });
    }
  });
});
