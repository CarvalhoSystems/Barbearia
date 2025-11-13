/*
=====================================================
js/index.js
Funcionalidades da Página Principal (Home)
=====================================================
*/

/*
====================================
1. BOTÃO VOLTAR AO TOPO
====================================
*/
const backToTopBtn = document.getElementById("backToTop");
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn.style.display = "block";
  } else {
    backToTopBtn.style.display = "none";
  }
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

/*
====================================
2. CARROSSEL DE DESTAQUES
====================================
*/
function iniciarCarousel(trackId) {
  const carouselContainer = document.getElementById(trackId);
  if (!carouselContainer) return;

  const track = carouselContainer.querySelector(".carousel-track");
  const slides = Array.from(track.children);
  const btnPrev = carouselContainer.querySelector(".prev");
  const btnNext = carouselContainer.querySelector(".next");

  if (!track || !slides.length || !btnPrev || !btnNext) return;

  const slideWidth = slides[0].getBoundingClientRect().width;
  let currentSlide = 0;

  function updateSlide(newIndex) {
    if (newIndex < 0) {
      newIndex = slides.length - 1;
    } else if (newIndex >= slides.length) {
      newIndex = 0;
    }
    track.style.transform = `translateX(-${slideWidth * newIndex}px)`;
    currentSlide = newIndex;
  }

  btnPrev.addEventListener("click", () => {
    updateSlide(currentSlide - 1);
  });

  btnNext.addEventListener("click", () => {
    updateSlide(currentSlide + 1);
  });

  setInterval(() => {
    updateSlide(currentSlide + 1);
  }, 5000);
}

/*
====================================
3. INICIALIZAÇÃO
====================================
*/
iniciarCarousel("carousel-container");

/*
====================================
4. MODAL DE DETALHES DOS SERVIÇOS
====================================
*/
document.addEventListener("DOMContentLoaded", () => {
  const detailButtons = document.querySelectorAll(".btn-details");
  const modalOverlay = document.getElementById("details-modal");
  const modalImage = document.getElementById("modal-image");
  const closeModalBtn = document.getElementById("close-modal");

  if (!modalOverlay || !modalImage || !closeModalBtn) return;

  detailButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault(); // Impede o link de seguir para '#'
      const imageSrc = button.getAttribute("data-image-src");
      if (imageSrc) {
        modalImage.setAttribute("src", imageSrc);
        modalOverlay.classList.add("active");
      }
    });
  });

  const closeModal = () => {
    modalOverlay.classList.remove("active");
  };

  closeModalBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (event) => {
    // Fecha o modal se clicar fora da imagem (no overlay)
    if (event.target === modalOverlay) {
      closeModal();
    }
  });
});
