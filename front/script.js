document.getElementById("signupForm")?.addEventListener("submit", function (e) { 
    e.preventDefault();
    document.getElementById("successModal").style.display = "flex";
});

document.getElementById("okBtn")?.addEventListener("click", function () {
    window.location.href = "login.html";
});

function togglePasswordVisibility(id) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}



// recuperar senha
const forgotForm = document.getElementById("forgotForm");

if (forgotForm) {
    forgotForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const result = document.getElementById("result");

        // senha aleatoria
        function gerarSenha() {
            return Math.random().toString(36).slice(-8);
        }

        const novaSenha = gerarSenha();

        result.style.color = "green";
        result.textContent = "Nova senha gerada: " + novaSenha;
    });
}