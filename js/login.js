/*
=====================================================
js/login.js
Lógica da Página de Login com Firebase Auth
=====================================================
*/

/*
====================================
1. REFERÊNCIAS DO DOM E FIREBASE
====================================
*/
const auth = firebase.auth();
const formLogin = document.getElementById("login-form");
const usuarioEmail = document.getElementById("user");
const senhaInput = document.getElementById("senha");
const mensagemArea = document.getElementById("mensagem_login");
const lembrarCheckbox = document.getElementById("lembrar");
const esqueciSenha = document.getElementById("esqueci_a_senha");

/*
====================================
2. LÓGICA DE LOGIN (SUBMISSÃO DO FORMULÁRIO)
====================================
*/
formLogin.addEventListener("submit", function (event) {
  event.preventDefault(); // Impede o recarregamento da página

  // Pega os valores dos inputs
  const email = usuarioEmail.value;
  const password = senhaInput.value;

  // Validação simples para garantir que os campos não estão vazios
  if (!email || !password) {
    Swal.fire({
      title: "Atenção",
      text: "Por favor, preencha todos os campos.",
      icon: "warning",
      confirmButtonText: "OK",
    });
    return;
  }

  // Mostra uma mensagem de carregamento para o usuário
  mensagemArea.textContent = "Aguarde...";
  mensagemArea.style.color = "yellow";

  // 🛑 CHAMA A API DO FIREBASE PARA AUTENTICAÇÃO
  auth
    .signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Sucesso no Login
      Swal.fire({
        icon: "success",
        title: "Login bem-sucedido!",
        timmer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      // Lógica de "Lembrar-me" (pode ser implementada com localStorage)
      if (lembrarCheckbox.checked) {
        // Exemplo: localStorage.setItem('rememberedEmail', email);
      }

      // Redireciona para o painel de controle após um breve atraso
      setTimeout(() => {
        window.location.href = "pages/dashboard.html";
      }, 500);
    })
    .catch((error) => {
      // Falha no Login (trata os erros comuns do Firebase)
      let errorMessage;
      switch (error.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          errorMessage = "❌ E-mail ou senha incorretos.";
          break;
        case "auth/invalid-email":
          errorMessage = "❌ Formato de e-mail inválido.";
          break;
        default:
          errorMessage = "❌ Erro ao tentar login. Tente novamente.";
          console.error("Erro de login:", error); // Loga o erro completo no console para depuração
      }
      mensagemArea.textContent = errorMessage;
      mensagemArea.style.color = "red";
    });
});

/*
====================================
3. LÓGICA DE "ESQUECI MINHA SENHA"
====================================
*/
esqueciSenha.addEventListener("click", function (event) {
  event.preventDefault();

  const usuarioPreenchido = usuarioEmail.value.trim() !== "";

  if (usuarioPreenchido) {
    // TODO: Implementar a redefinição de senha do Firebase aqui.
    // Por enquanto, a mensagem de manutenção é exibida.
    mensagemArea.textContent = "Em manutenção !";
    mensagemArea.style.color = "red";
  } else {
    // Pede para o usuário digitar o e-mail antes de clicar em "esqueci a senha"
    mensagemArea.textContent = "Digite seu e-mail para redefinir a senha.";
    mensagemArea.style.color = "red";
  }
});
