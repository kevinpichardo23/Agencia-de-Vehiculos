"use strict";

const API_AUTH = "http://localhost:3000/api/auth";

const D = {
  tabLogin:     document.getElementById("tabLogin"),
  tabRegistro:  document.getElementById("tabRegistro"),
  cardTitle:    document.getElementById("cardTitle"),
  formLogin:    document.getElementById("formLogin"),
  formRegistro: document.getElementById("formRegistro"),
  msgLogin:     document.getElementById("msgLogin"),
  msgRegistro:  document.getElementById("msgRegistro"),
  btnLogin:     document.getElementById("btnLogin"),
  btnRegistro:  document.getElementById("btnRegistro"),
  btnInvitado:  document.getElementById("btnInvitado"),
  toastStack:   document.getElementById("toastStack"),
};

/* ============================================================
   Si ya hay una sesión activa válida, saltar directo al sistema
   ============================================================ */
(function redirigirSiYaHaySesion() {
  const token = localStorage.getItem("automax_token");
  if (token) {
    window.location.href = "index.html";
  }
})();

/* ============================================================
   TOASTS (idéntico al patrón usado en app.js)
   ============================================================ */
function toast(msg, tipo = "success") {
  const t = document.createElement("div");
  t.className = `toast toast--${tipo}`;
  t.innerHTML = `<span class="toast__dot"></span><span>${msg}</span>`;
  D.toastStack.appendChild(t);
  requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add("toast--show")); });
  setTimeout(() => {
    t.classList.remove("toast--show");
    setTimeout(() => t.remove(), 300);
  }, 3500);
}

/* ============================================================
   MENSAJES DE FORMULARIO (caja de error/éxito dentro del card)
   ============================================================ */
function mostrarMensaje(el, texto, tipo) {
  el.textContent = texto;
  el.className = `auth-form__msg auth-form__msg--show auth-form__msg--${tipo}`;
}

function limpiarMensaje(el) {
  el.textContent = "";
  el.className = "auth-form__msg";
}

function marcarError(inputId, errId, texto) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  input.classList.add("afield__input--invalid");
  err.textContent = texto;
}

function limpiarErrores(formEl) {
  formEl.querySelectorAll(".afield__input--invalid").forEach(i => i.classList.remove("afield__input--invalid"));
  formEl.querySelectorAll(".afield__err").forEach(e => e.textContent = "");
}

/* ============================================================
   TABS LOGIN / REGISTRO
   ============================================================ */
function activarTab(nombre) {
  const esLogin = nombre === "login";

  D.tabLogin.classList.toggle("auth-tab--active", esLogin);
  D.tabRegistro.classList.toggle("auth-tab--active", !esLogin);

  D.formLogin.classList.toggle("auth-form--hidden", !esLogin);
  D.formRegistro.classList.toggle("auth-form--hidden", esLogin);

  D.cardTitle.textContent = esLogin ? "Inicia sesión" : "Crea tu cuenta";

  limpiarMensaje(D.msgLogin);
  limpiarMensaje(D.msgRegistro);
}

D.tabLogin.addEventListener("click", () => activarTab("login"));
D.tabRegistro.addEventListener("click", () => activarTab("registro"));

/* ============================================================
   GUARDAR SESIÓN Y REDIRIGIR AL SISTEMA DE VEHÍCULOS
   ============================================================ */
function iniciarSesionLocal({ token, usuario, invitado = false }) {
  if (invitado) {
    localStorage.setItem("automax_invitado", "1");
    localStorage.removeItem("automax_token");
    localStorage.removeItem("automax_usuario");
  } else {
    localStorage.setItem("automax_token", token);
    localStorage.setItem("automax_usuario", JSON.stringify(usuario));
    localStorage.removeItem("automax_invitado");
  }
  window.location.href = "index.html";
}

/* ============================================================
   LOGIN
   ============================================================ */
D.formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores(D.formLogin);
  limpiarMensaje(D.msgLogin);

  const correo   = document.getElementById("loginCorreo").value.trim();
  const password = document.getElementById("loginPassword").value;

  let valido = true;
  if (!correo) { marcarError("loginCorreo", "errLoginCorreo", "Ingresa tu correo."); valido = false; }
  if (!password) { marcarError("loginPassword", "errLoginPassword", "Ingresa tu contraseña."); valido = false; }
  if (!valido) return;

  D.btnLogin.disabled = true;
  D.btnLogin.textContent = "Verificando…";

  try {
    const res = await fetch(`${API_AUTH}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(D.msgLogin, data.error || "No se pudo iniciar sesión.", "error");
      toast(data.error || "Credenciales incorrectas.", "error");
      return;
    }

    mostrarMensaje(D.msgLogin, data.mensaje || "Acceso correcto.", "success");
    toast(data.mensaje || "Acceso correcto.", "success");

    setTimeout(() => {
      iniciarSesionLocal({ token: data.token, usuario: data.usuario });
    }, 500);

  } catch (error) {
    console.error(error);
    mostrarMensaje(D.msgLogin, "No se pudo conectar con el servidor.", "error");
    toast("No se pudo conectar con el servidor.", "error");
  } finally {
    D.btnLogin.disabled = false;
    D.btnLogin.textContent = "Iniciar sesión";
  }
});

/* ============================================================
   REGISTRO
   ============================================================ */
D.formRegistro.addEventListener("submit", async (e) => {
  e.preventDefault();
  limpiarErrores(D.formRegistro);
  limpiarMensaje(D.msgRegistro);

  const nombre    = document.getElementById("regNombre").value.trim();
  const correo    = document.getElementById("regCorreo").value.trim();
  const password  = document.getElementById("regPassword").value;
  const password2 = document.getElementById("regPassword2").value;

  let valido = true;

  if (!nombre) { marcarError("regNombre", "errRegNombre", "Ingresa tu nombre."); valido = false; }

  if (!correo) {
    marcarError("regCorreo", "errRegCorreo", "Ingresa tu correo.");
    valido = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    marcarError("regCorreo", "errRegCorreo", "El correo no es válido.");
    valido = false;
  }

  if (!password) {
    marcarError("regPassword", "errRegPassword", "Ingresa una contraseña.");
    valido = false;
  } else if (password.length < 6) {
    marcarError("regPassword", "errRegPassword", "Mínimo 6 caracteres.");
    valido = false;
  }

  if (password2 !== password) {
    marcarError("regPassword2", "errRegPassword2", "Las contraseñas no coinciden.");
    valido = false;
  }

  if (!valido) return;

  D.btnRegistro.disabled = true;
  D.btnRegistro.textContent = "Creando cuenta…";

  try {
    const res = await fetch(`${API_AUTH}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, correo, password })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarMensaje(D.msgRegistro, data.error || "No se pudo registrar el usuario.", "error");
      toast(data.error || "No se pudo registrar el usuario.", "error");
      return;
    }

    mostrarMensaje(D.msgRegistro, data.mensaje || "Cuenta creada correctamente.", "success");
    toast(data.mensaje || "Cuenta creada correctamente.", "success");

    setTimeout(() => {
      iniciarSesionLocal({ token: data.token, usuario: data.usuario });
    }, 500);

  } catch (error) {
    console.error(error);
    mostrarMensaje(D.msgRegistro, "No se pudo conectar con el servidor.", "error");
    toast("No se pudo conectar con el servidor.", "error");
  } finally {
    D.btnRegistro.disabled = false;
    D.btnRegistro.textContent = "Crear cuenta";
  }
});

/* ============================================================
   ACCESO COMO INVITADO
   ============================================================ */
D.btnInvitado.addEventListener("click", () => {
  toast("Ingresando como invitado…", "success");
  setTimeout(() => {
    iniciarSesionLocal({ invitado: true });
  }, 400);
});
