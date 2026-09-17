// ─────────────────────────────────────────────────
//  UniMap – Campus Universitario Interactivo
// ─────────────────────────────────────────────────

(function () {
  'use strict';

  // ── DATA ──────────────────────────────────────────
  const USERS_KEY = 'unimap_users';
  const RESERVATIONS_KEY = 'unimap_reservations';

  const USERS = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const reservations = JSON.parse(localStorage.getItem(RESERVATIONS_KEY) || '[]');

  const DAYS = ['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const HOURS = Array.from({length:13},(_,i)=>`${(i+7).toString().padStart(2,'0')}:00`);

  const COLORS = {
    available: '#059669',
    unavailable: '#dc2626',
    reserved: '#d97706',
    wall: '#374151',
    floor: '#f3f4f6',
    floorLine: '#d1d5db',
    hallway: '#e5e7eb',
    youAreHere: '#1a56db',
    grass: '#86efac',
    parking: '#9ca3af',
    path: '#d1d5db',
    water: '#60a5fa',
    building: '#e5e7eb',
    highlight: 'rgba(26,86,219,0.25)',
    selected: 'rgba(26,86,219,0.4)'
  };

  const FACULTY = [
    { id:'f1', name:'Dr. Carlos Mendez', dept:'Ciencias de la Computacion', email:'cmendez@uni.edu',
      schedule:{ 0:['08:00-10:00','14:00-16:00'], 1:['10:00-12:00'], 2:['08:00-10:00'], 3:['14:00-16:00'], 4:['10:00-12:00'] }},
    { id:'f2', name:'Dra. Laura Sanchez', dept:'Matematicas', email:'lsanchez@uni.edu',
      schedule:{ 0:['10:00-12:00'], 1:['08:00-10:00','16:00-18:00'], 2:['10:00-12:00'], 3:['08:00-10:00'], 4:['14:00-16:00'] }},
    { id:'f3', name:'Dr. Roberto Diaz', dept:'Fisica', email:'rdiaz@uni.edu',
      schedule:{ 0:['12:00-14:00'], 1:['12:00-14:00'], 2:['14:00-16:00'], 3:['12:00-14:00'], 4:['08:00-10:00'] }},
    { id:'f4', name:'Dra. Maria Torres', dept:'Ingenieria Electrica', email:'mtorres@uni.edu',
      schedule:{ 0:['08:00-10:00','14:00-16:00'], 1:['08:00-10:00'], 2:['10:00-12:00'], 3:['14:00-16:00'], 4:['10:00-12:00'] }},
    { id:'f5', name:'Dr. Fernando Reyes', dept:'Quimica', email:'freyes@uni.edu',
      schedule:{ 0:['10:00-12:00'], 1:['14:00-16:00'], 2:['08:00-10:00'], 3:['10:00-12:00'], 4:['14:00-16:00'] }},
    { id:'f6', name:'Dra. Ana Gutierrez', dept:'Ciencias Sociales', email:'agutierrez@uni.edu',
      schedule:{ 0:['08:00-10:00'], 1:['10:00-12:00','14:00-16:00'], 2:['14:00-16:00'], 3:['08:00-10:00'], 4:['10:00-12:00'] }},
    { id:'f7', name:'Dr. Javier Morales', dept:'Administracion', email:'jmorales@uni.edu',
      schedule:{ 0:['14:00-16:00'], 1:['08:00-10:00'], 2:['10:00-12:00'], 3:['14:00-16:00'], 4:['08:00-10:00'] }},
    { id:'f8', name:'Dra. Patricia Luna', dept:'Derecho', email:'pluna@uni.edu',
      schedule:{ 0:['10:00-12:00'], 1:['14:00-16:00'], 2:['08:00-10:00'], 3:['10:00-12:00'], 4:['14:00-16:00'] }}
  ];

  // Floor plan definitions
  function buildSpaces(floor) {
    const base = [];
    const f = floor;
    if (f === 0) {
      // Planta Baja – edificio principal + zona exterior
      base.push(
        // Edificio principal
        {id:'pb-a1', name:'Aula 101', type:'aula', floor:0, x:60, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f1'},
        {id:'pb-a2', name:'Aula 102', type:'aula', floor:0, x:200, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f2'},
        {id:'pb-a3', name:'Aula 103', type:'aula', floor:0, x:340, y:60, w:120, h:80, capacity:35, status:'reserved', teacher:null},
        {id:'pb-l1', name:'Lab. Informatica', type:'laboratorio', floor:0, x:60, y:160, w:160, h:90, capacity:30, status:'available', teacher:'f3'},
        {id:'pb-l2', name:'Lab. Fisica', type:'laboratorio', floor:0, x:240, y:160, w:160, h:90, capacity:25, status:'unavailable', teacher:null},
        {id:'pb-of1', name:'Direccion General', type:'oficina', floor:0, x:420, y:60, w:100, h:80, capacity:5, status:'unavailable', teacher:null},
        {id:'pb-of2', name:'Secretaria Academica', type:'oficina', floor:0, x:420, y:160, w:100, h:90, capacity:8, status:'available', teacher:null},
        {id:'pb-bib', name:'Biblioteca Central', type:'biblioteca', floor:0, x:60, y:280, w:200, h:120, capacity:100, status:'available', teacher:null},
        {id:'pb-aud', name:'Auditorio Principal', type:'auditorio', floor:0, x:280, y:280, w:240, h:120, capacity:200, status:'available', teacher:null},
        {id:'pb-com', name:'Comedor Universitario', type:'comedor', floor:0, x:60, y:420, w:200, h:80, capacity:150, status:'available', teacher:null},
        {id:'pb-sal1', name:'Salon de Eventos', type:'salon', floor:0, x:280, y:420, w:240, h:80, capacity:80, status:'reserved', teacher:null},
        // Pasillo principal
        {id:'pb-pas', name:'Pasillo Principal', type:'pasillo', floor:0, x:540, y:60, w:30, h:440, capacity:0, status:'available', teacher:null},
        // Zona de deportes
        {id:'pb-dep', name:'Cancha Deportiva', type:'deportivo', floor:0, x:600, y:60, w:160, h:180, capacity:50, status:'available', teacher:null},
        // Estacionamiento
        {id:'pb-par', name:'Estacionamiento', type:'estacionamiento', floor:0, x:600, y:260, w:160, h:120, capacity:40, status:'available', teacher:null},
        // jardin
        {id:'pb-jar', name:'Jardin Central', type:'jardin', floor:0, x:600, y:400, w:160, h:100, capacity:0, status:'available', teacher:null},
      );
    } else if (f === 1) {
      base.push(
        {id:'p1-a1', name:'Aula 201', type:'aula', floor:1, x:60, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f4'},
        {id:'p1-a2', name:'Aula 202', type:'aula', floor:1, x:200, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f5'},
        {id:'p1-a3', name:'Aula 203', type:'aula', floor:1, x:340, y:60, w:120, h:80, capacity:35, status:'unavailable', teacher:null},
        {id:'p1-l1', name:'Lab. Quimica', type:'laboratorio', floor:1, x:60, y:160, w:160, h:90, capacity:25, status:'available', teacher:'f5'},
        {id:'p1-l2', name:'Lab. Electronica', type:'laboratorio', floor:1, x:240, y:160, w:160, h:90, capacity:20, status:'available', teacher:'f4'},
        {id:'p1-of1', name:'Dept. Ciencias', type:'oficina', floor:1, x:420, y:60, w:100, h:80, capacity:4, status:'unavailable', teacher:null},
        {id:'p1-of2', name:'Dept. Ingenieria', type:'oficina', floor:1, x:420, y:160, w:100, h:90, capacity:6, status:'available', teacher:null},
        {id:'p1-sa1', name:'Salon Multiuso', type:'salon', floor:1, x:60, y:280, w:200, h:100, capacity:60, status:'available', teacher:null},
        {id:'p1-a4', name:'Aula 204', type:'aula', floor:1, x:280, y:280, w:120, h:80, capacity:35, status:'reserved', teacher:'f6'},
        {id:'p1-a5', name:'Aula 205', type:'aula', floor:1, x:420, y:280, w:100, h:80, capacity:30, status:'available', teacher:'f7'},
        {id:'p1-pas', name:'Pasillo P1', type:'pasillo', floor:1, x:540, y:60, w:30, h:300, capacity:0, status:'available', teacher:null},
        {id:'p1-toilets', name:'Sanitarios', type:'sanitarios', floor:1, x:60, y:400, w:80, h:50, capacity:0, status:'available', teacher:null},
      );
    } else if (f === 2) {
      base.push(
        {id:'p2-a1', name:'Aula 301', type:'aula', floor:2, x:60, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f8'},
        {id:'p2-a2', name:'Aula 302', type:'aula', floor:2, x:200, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f1'},
        {id:'p2-a3', name:'Aula 303', type:'aula', floor:2, x:340, y:60, w:120, h:80, capacity:30, status:'available', teacher:'f3'},
        {id:'p2-l1', name:'Lab. Biologia', type:'laboratorio', floor:2, x:60, y:160, w:160, h:90, capacity:25, status:'unavailable', teacher:null},
        {id:'p2-l2', name:'Lab. Redes', type:'laboratorio', floor:2, x:240, y:160, w:160, h:90, capacity:20, status:'available', teacher:'f1'},
        {id:'p2-of1', name:'Dept. Sociales', type:'oficina', floor:2, x:420, y:60, w:100, h:80, capacity:4, status:'available', teacher:null},
        {id:'p2-of2', name:'Sala de Profesores', type:'oficina', floor:2, x:420, y:160, w:100, h:90, capacity:12, status:'available', teacher:null},
        {id:'p2-a4', name:'Aula 304', type:'aula', floor:2, x:60, y:280, w:120, h:80, capacity:35, status:'reserved', teacher:'f2'},
        {id:'p2-sa1', name:'Seminario', type:'salon', floor:2, x:200, y:280, w:160, h:80, capacity:40, status:'available', teacher:null},
        {id:'p2-pas', name:'Pasillo P2', type:'pasillo', floor:2, x:540, y:60, w:30, h:300, capacity:0, status:'available', teacher:null},
      );
    } else if (f === 3) {
      base.push(
        {id:'p3-a1', name:'Aula 401', type:'aula', floor:3, x:60, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f6'},
        {id:'p3-a2', name:'Aula 402', type:'aula', floor:3, x:200, y:60, w:120, h:80, capacity:40, status:'available', teacher:'f7'},
        {id:'p3-of1', name:'Direccion de Carrera', type:'oficina', floor:3, x:340, y:60, w:180, h:80, capacity:6, status:'unavailable', teacher:null},
        {id:'p3-l1', name:'Lab. Avanzado', type:'laboratorio', floor:3, x:60, y:160, w:160, h:90, capacity:20, status:'available', teacher:'f8'},
        {id:'p3-sa1', name:'Sala de Conferencias', type:'salon', floor:3, x:240, y:160, w:280, h:90, capacity:80, status:'available', teacher:null},
        {id:'p3-pas', name:'Pasillo P3', type:'pasillo', floor:3, x:540, y:60, w:30, h:200, capacity:0, status:'available', teacher:null},
        {id:'p3-terraza', name:'Terraza', type:'jardin', floor:3, x:60, y:280, w:460, h:80, capacity:0, status:'available', teacher:null},
      );
    }
    return base;
  }

  // ── STATE ─────────────────────────────────────────
  let currentUser = null;
  let currentFloor = 0;
  let spaces = buildSpaces(0);
  let allSpaces = [];
  for (let f = 0; f <= 3; f++) allSpaces.push(...buildSpaces(f));

  let zoom = 1;
  let panX = 0, panY = 0;
  let isDragging = false;
  let dragStart = {x:0, y:0};
  let selectedSpace = null;
  let hoveredSpace = null;
  let filters = {
    types: ['aula','laboratorio','oficina','biblioteca','auditorio','comedor','deportivo','salon'],
    availability: ['available','unavailable','reserved'],
    floors: [0,1,2,3]
  };

  // ── DOM ───────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const authScreen = $('auth-screen');
  const mapScreen = $('map-screen');
  const loginForm = $('login-form');
  const registerForm = $('register-form');
  const canvas = $('map-canvas');
  const ctx = canvas.getContext('2d');
  const tooltip = $('map-tooltip');

  // ── AUTH HELPERS ──────────────────────────────────
  function getUsers() { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
  function saveUsers(arr) { localStorage.setItem(USERS_KEY, JSON.stringify(arr)); }
  function getReservations() { return JSON.parse(localStorage.getItem(RESERVATIONS_KEY) || '[]'); }
  function saveReservations(arr) { localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(arr)); }

  function showNotification(msg, duration=3000) {
    const n = $('notification');
    $('notification-msg').textContent = msg;
    n.classList.remove('hidden');
    clearTimeout(n._timer);
    n._timer = setTimeout(() => n.classList.add('hidden'), duration);
  }

  // ── VALIDATION ────────────────────────────────────
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showError(fieldId, msg) {
    const el = $(fieldId);
    const errEl = $(fieldId + '-error');
    if (el) el.classList.add('error');
    if (errEl) errEl.textContent = msg;
  }

  function clearError(fieldId) {
    const el = $(fieldId);
    const errEl = $(fieldId + '-error');
    if (el) el.classList.remove('error');
    if (errEl) errEl.textContent = '';
  }

  function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');
    document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
  }

  // ── AUTH EVENTS ───────────────────────────────────
  $('show-register').addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    clearAllErrors();
  });

  $('show-login').addEventListener('click', e => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    clearAllErrors();
  });

  // Toggle password visibility
  document.querySelectorAll('.toggle-pass').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = $(btn.dataset.target);
      if (input.type === 'password') { input.type = 'text'; btn.textContent = 'Ocultar'; }
      else { input.type = 'password'; btn.textContent = 'Mostrar'; }
    });
  });

  // Password strength
  $('reg-pass').addEventListener('input', function() {
    const val = this.value;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const el = $('pass-strength');
    const pct = (score / 5) * 100;
    let color = '#dc2626';
    if (score >= 4) color = '#059669';
    else if (score >= 2) color = '#d97706';
    el.style.setProperty('--strength', pct + '%');
    el.style.background = val ? `linear-gradient(to right, ${color} ${pct}%, #e5e7eb ${pct}%)` : '#e5e7eb';
  });

  // LOGIN
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    clearAllErrors();
    let valid = true;

    const email = $('login-email').value.trim();
    const pass = $('login-pass').value;

    if (!email) { showError('login-email', 'El correo es obligatorio'); valid = false; }
    else if (!validateEmail(email)) { showError('login-email', 'Correo invalido'); valid = false; }

    if (!pass) { showError('login-pass', 'La contrasena es obligatoria'); valid = false; }
    else if (pass.length < 6) { showError('login-pass', 'Minimo 6 caracteres'); valid = false; }

    if (!valid) return;

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === pass);
    if (!user) {
      showError('login-pass', 'Correo o contrasena incorrectos');
      return;
    }

    currentUser = user;
    enterMap();
  });

  // REGISTER
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    clearAllErrors();
    let valid = true;

    const name = $('reg-name').value.trim();
    const last = $('reg-last').value.trim();
    const email = $('reg-email').value.trim();
    const role = $('reg-role').value;
    const pass = $('reg-pass').value;
    const pass2 = $('reg-pass2').value;

    if (!name) { showError('reg-name', 'Nombre requerido'); valid = false; }
    else if (name.length < 2) { showError('reg-name', 'Minimo 2 caracteres'); valid = false; }

    if (!last) { showError('reg-last', 'Apellido requerido'); valid = false; }
    else if (last.length < 2) { showError('reg-last', 'Minimo 2 caracteres'); valid = false; }

    if (!email) { showError('reg-email', 'Correo requerido'); valid = false; }
    else if (!validateEmail(email)) { showError('reg-email', 'Correo invalido'); valid = false; }

    if (!role) { showError('reg-role', 'Selecciona un rol'); valid = false; }

    if (!pass) { showError('reg-pass', 'Contrasena requerida'); valid = false; }
    else if (pass.length < 6) { showError('reg-pass', 'Minimo 6 caracteres'); valid = false; }

    if (!pass2) { showError('reg-pass2', 'Confirma tu contrasena'); valid = false; }
    else if (pass !== pass2) { showError('reg-pass2', 'Las contrasenas no coinciden'); valid = false; }

    if (!valid) return;

    const users = getUsers();
    if (users.find(u => u.email === email)) {
      showError('reg-email', 'Este correo ya esta registrado');
      return;
    }

    const newUser = { id: 'u' + Date.now(), name, last, email, role, password: pass };
    users.push(newUser);
    saveUsers(users);
    currentUser = newUser;
    showNotification('Cuenta creada exitosamente');
    enterMap();
  });

  // GUEST
  $('guest-btn').addEventListener('click', () => {
    currentUser = { id: 'guest', name: 'Invitado', last: '', email: '', role: 'invitado' };
    enterMap();
  });

  // LOGOUT
  $('logout-btn').addEventListener('click', () => {
    currentUser = null;
    mapScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    clearAllErrors();
    loginForm.reset();
    registerForm.reset();
  });

  function enterMap() {
    authScreen.classList.add('hidden');
    mapScreen.classList.remove('hidden');
    $('user-name-display').textContent = currentUser.name + (currentUser.last ? ' ' + currentUser.last : '');
    currentFloor = 0;
    spaces = buildSpaces(0);
    zoom = 1; panX = 0; panY = 0;
    selectedSpace = null;
    hideTooltip();
    resizeCanvas();
    draw();
  }

  // ── CANVAS RESIZE ─────────────────────────────────
  function resizeCanvas() {
    const wrapper = $('map-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
    draw();
  }

  window.addEventListener('resize', resizeCanvas);

  // ── DRAWING ───────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Background
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, 800, 600);

    // Grid
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= 800; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
    }
    for (let y = 0; y <= 600; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke();
    }

    // Draw building outline
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, 530, 470);

    // Draw spaces
    const visibleSpaces = getVisibleSpaces();
    visibleSpaces.forEach(s => {
      const isHovered = hoveredSpace && hoveredSpace.id === s.id;
      const isSelected = selectedSpace && selectedSpace.id === s.id;

      // Fill
      let fillColor;
      if (s.type === 'pasillo') fillColor = COLORS.hallway;
      else if (s.type === 'jardin') fillColor = COLORS.grass;
      else if (s.type === 'estacionamiento') fillColor = COLORS.parking;
      else if (s.type === 'sanitarios') fillColor = '#e0e7ff';
      else {
        switch(s.status) {
          case 'available': fillColor = '#d1fae5'; break;
          case 'unavailable': fillColor = '#fee2e2'; break;
          case 'reserved': fillColor = '#fef3c7'; break;
          default: fillColor = '#f3f4f6';
        }
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // Border
      ctx.strokeStyle = isHovered || isSelected ? COLORS.youAreHere : COLORS.wall;
      ctx.lineWidth = isHovered || isSelected ? 2.5 : 1.5;
      ctx.strokeRect(s.x, s.y, s.w, s.h);

      // Highlight
      if (isSelected) {
        ctx.fillStyle = COLORS.selected;
        ctx.fillRect(s.x, s.y, s.w, s.h);
      }

      // Label
      if (s.w > 50 && s.h > 30 && s.type !== 'pasillo') {
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = wrapText(s.name, s.w - 8);
        const lineH = 13;
        const startY = s.y + s.h/2 - (lines.length - 1) * lineH / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, s.x + s.w/2, startY + i * lineH);
        });

        // Status icon
        if (s.type !== 'pasillo' && s.type !== 'jardin' && s.type !== 'estacionamiento' && s.type !== 'sanitarios') {
          const iconX = s.x + s.w - 10;
          const iconY = s.y + 10;
          ctx.beginPath();
          ctx.arc(iconX, iconY, 4, 0, Math.PI * 2);
          switch(s.status) {
            case 'available': ctx.fillStyle = COLORS.available; break;
            case 'unavailable': ctx.fillStyle = COLORS.unavailable; break;
            case 'reserved': ctx.fillStyle = COLORS.reserved; break;
          }
          ctx.fill();
        }
      }
    });

    // "You are here" marker
    drawYouAreHere();

    // Floor label
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(600, 500, 160, 30);
    ctx.strokeStyle = var_gray300();
    ctx.lineWidth = 1;
    ctx.strokeRect(600, 500, 160, 30);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getFloorLabel(), 680, 515);

    ctx.restore();

    $('zoom-level').textContent = Math.round(zoom * 100) + '%';
  }

  function var_gray300() { return '#d1d5db'; }

  function wrapText(text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return [text];
    const words = text.split(' ');
    const lines = [];
    let current = '';
    words.forEach(w => {
      const test = current ? current + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function drawYouAreHere() {
    // Fixed position for "you are here"
    const px = 555;
    const py = 280;

    // Pulsing circle
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 4 + 10;

    ctx.beginPath();
    ctx.arc(px, py, pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(26,86,219,0.15)';
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.youAreHere;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(26,86,219,0.9)';
    const labelW = ctx.measureText('Usted aqui').width + 16;
    ctx.fillRect(px - labelW/2, py - 28, labelW, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Usted aqui', px, py - 19);
  }

  function getFloorLabel() {
    return ['Planta Baja', 'Piso 1', 'Piso 2', 'Piso 3'][currentFloor];
  }

  function getVisibleSpaces() {
    return spaces.filter(s => {
      if (!filters.types.includes(s.type)) return false;
      if (!filters.availability.includes(s.status)) return false;
      return true;
    });
  }

  // ── INTERACTION ───────────────────────────────────
  function screenToWorld(sx, sy) {
    return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
  }

  function findSpaceAt(wx, wy) {
    const visible = getVisibleSpaces();
    for (let i = visible.length - 1; i >= 0; i--) {
      const s = visible[i];
      if (wx >= s.x && wx <= s.x + s.w && wy >= s.y && wy <= s.y + s.h) return s;
    }
    return null;
  }

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart = { x: e.clientX - panX, y: e.clientY - panY };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (isDragging) {
      panX = e.clientX - dragStart.x;
      panY = e.clientY - dragStart.y;
      draw();
      hideTooltip();
      return;
    }

    const space = findSpaceAt(world.x, world.y);
    if (space !== hoveredSpace) {
      hoveredSpace = space;
      canvas.style.cursor = space ? 'pointer' : 'grab';
      draw();
      if (space) showTooltip(space, e.clientX, e.clientY);
      else hideTooltip();
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = hoveredSpace ? 'pointer' : 'grab';
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    hoveredSpace = null;
    draw();
    hideTooltip();
  });

  canvas.addEventListener('click', e => {
    if (isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy);
    const space = findSpaceAt(world.x, world.y);

    if (space && space.type !== 'pasillo' && space.type !== 'jardin' && space.type !== 'estacionamiento' && space.type !== 'sanitarios') {
      selectedSpace = space;
      draw();
      showTooltip(space, e.clientX, e.clientY);
    } else {
      selectedSpace = null;
      hideTooltip();
      draw();
    }
  });

  // Zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.5), 3);

    panX = mx - (mx - panX) * (newZoom / zoom);
    panY = my - (my - panY) * (newZoom / zoom);
    zoom = newZoom;
    draw();
  }, { passive: false });

  $('zoom-in').addEventListener('click', () => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const newZoom = Math.min(zoom * 1.25, 3);
    panX = cx - (cx - panX) * (newZoom / zoom);
    panY = cy - (cy - panY) * (newZoom / zoom);
    zoom = newZoom;
    draw();
  });

  $('zoom-out').addEventListener('click', () => {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const newZoom = Math.max(zoom * 0.8, 0.5);
    panX = cx - (cx - panX) * (newZoom / zoom);
    panY = cy - (cy - panY) * (newZoom / zoom);
    zoom = newZoom;
    draw();
  });

  $('zoom-reset').addEventListener('click', () => {
    zoom = 1; panX = 0; panY = 0;
    draw();
  });

  // ── TOOLTIP ───────────────────────────────────────
  function showTooltip(space, mx, my) {
    $('tooltip-name').textContent = space.name;

    const statusEl = $('tooltip-status');
    statusEl.textContent = {available:'Disponible',unavailable:'No disponible',reserved:'Reservado'}[space.status];
    statusEl.className = 'tooltip-status ' + space.status;

    const typeLabels = {
      aula:'Aula',laboratorio:'Laboratorio',oficina:'Oficina',biblioteca:'Biblioteca',
      auditorio:'Auditorio',comedor:'Comedor',deportivo:'Area Deportiva',salon:'Salon',
      jardin:'Jardin',estacionamiento:'Estacionamiento',sanitarios:'Sanitarios',pasillo:'Pasillo'
    };
    $('tooltip-type').textContent = typeLabels[space.type] || space.type;

    let info = '';
    if (space.capacity) info += `Capacidad: ${space.capacity} personas`;
    if (space.teacher) {
      const t = FACULTY.find(f => f.id === space.teacher);
      if (t) info += `\nDocente: ${t.name}`;
    }
    $('tooltip-info').textContent = info;

    // Schedule for this space
    let schedHTML = '';
    if (space.teacher) {
      const t = FACULTY.find(f => f.id === space.teacher);
      if (t) {
        schedHTML = '<strong>Horario del docente:</strong><br>';
        DAYS.forEach((day, i) => {
          const slots = t.schedule[i] || [];
          schedHTML += `${day}: ${slots.length ? slots.join(', ') : '---'}<br>`;
        });
      }
    } else if (space.status === 'reserved') {
      const res = reservations.find(r => r.spaceId === space.id);
      if (res) schedHTML = `Reservado por: ${res.userName}<br>Motivo: ${res.purpose}`;
    }
    $('tooltip-schedule').innerHTML = schedHTML;

    // Action button
    const actionBtn = $('tooltip-action');
    if (space.status === 'available' && space.type !== 'pasillo' && space.type !== 'jardin' && space.type !== 'estacionamiento' && space.type !== 'sanitarios') {
      actionBtn.classList.remove('hidden');
      actionBtn.onclick = () => openReservationModal(space);
    } else {
      actionBtn.classList.add('hidden');
    }

    // Position
    const tipW = 250;
    const tipH = tooltip.offsetHeight || 200;
    let tx = mx + 15;
    let ty = my - 10;
    if (tx + tipW > window.innerWidth) tx = mx - tipW - 15;
    if (ty + tipH > window.innerHeight) ty = window.innerHeight - tipH - 10;
    if (ty < 60) ty = 60;

    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
    tooltip.classList.remove('hidden');
  }

  function hideTooltip() {
    tooltip.classList.add('hidden');
  }

  // ── FLOOR SELECTOR ────────────────────────────────
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.floor-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFloor = parseInt(btn.dataset.floor);
      spaces = buildSpaces(currentFloor);
      $('current-floor-label').textContent = getFloorLabel();
      selectedSpace = null;
      hoveredSpace = null;
      hideTooltip();
      draw();
    });
  });

  // ── SEARCH ────────────────────────────────────────
  const searchInput = $('search-input');
  const searchResults = $('search-results');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchResults.classList.add('hidden'); return; }

    const results = allSpaces.filter(s => {
      if (s.type === 'pasillo') return false;
      const matchName = s.name.toLowerCase().includes(q);
      const matchType = s.type.toLowerCase().includes(q);
      let matchTeacher = false;
      if (s.teacher) {
        const t = FACULTY.find(f => f.id === s.teacher);
        if (t) matchTeacher = t.name.toLowerCase().includes(q) || t.dept.toLowerCase().includes(q);
      }
      return matchName || matchType || matchTeacher;
    });

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No se encontraron resultados</div>';
    } else {
      searchResults.innerHTML = results.map(s => {
        const typeLabels = {aula:'Aula',laboratorio:'Lab',oficina:'Oficina',biblioteca:'Biblioteca',auditorio:'Auditorio',comedor:'Comedor',deportivo:'Deportivo',salon:'Salon'};
        let detail = `${typeLabels[s.type] || s.type} - Piso ${s.floor}`;
        if (s.teacher) {
          const t = FACULTY.find(f => f.id === s.teacher);
          if (t) detail += ` - ${t.name}`;
        }
        return `<div class="search-result-item" data-id="${s.id}" data-floor="${s.floor}">
          <div class="sr-name">${s.name}</div>
          <div class="sr-detail">${detail}</div>
        </div>`;
      }).join('');
    }
    searchResults.classList.remove('hidden');
  });

  searchResults.addEventListener('click', e => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;
    const id = item.dataset.id;
    const floor = parseInt(item.dataset.floor);

    // Switch floor if needed
    if (floor !== currentFloor) {
      document.querySelectorAll('.floor-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.floor) === floor);
      });
      currentFloor = floor;
      spaces = buildSpaces(floor);
      $('current-floor-label').textContent = getFloorLabel();
    }

    const space = allSpaces.find(s => s.id === id) || spaces.find(s => s.id === id);
    if (space) {
      selectedSpace = space;
      // Center on space
      const cx = space.x + space.w / 2;
      const cy = space.y + space.h / 2;
      panX = canvas.width / 2 - cx * zoom;
      panY = canvas.height / 2 - cy * zoom;
      draw();
    }

    searchResults.classList.add('hidden');
    searchInput.value = '';
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container')) searchResults.classList.add('hidden');
  });

  $('search-btn').addEventListener('click', () => {
    searchInput.dispatchEvent(new Event('input'));
  });

  // ── FILTERS ───────────────────────────────────────
  $('filter-toggle').addEventListener('click', () => {
    $('filter-panel').classList.toggle('hidden');
    $('schedule-panel').classList.add('hidden');
  });

  $('filter-close').addEventListener('click', () => $('filter-panel').classList.add('hidden'));

  $('apply-filters').addEventListener('click', () => {
    filters.types = [];
    $('filter-panel').querySelectorAll('.filter-section:first-of-type input[type=checkbox]').forEach(cb => {
      if (cb.checked) filters.types.push(cb.value);
    });

    filters.availability = [];
    if ($('filter-available').checked) filters.availability.push('available');
    if ($('filter-unavailable').checked) filters.availability.push('unavailable');
    if ($('filter-reserved').checked) filters.availability.push('reserved');

    filters.floors = [];
    $('floor-filters').querySelectorAll('input[type=checkbox]').forEach(cb => {
      if (cb.checked) filters.floors.push(parseInt(cb.value));
    });

    draw();
    $('filter-panel').classList.add('hidden');
    showNotification('Filtros aplicados');
  });

  $('reset-filters').addEventListener('click', () => {
    $('filter-panel').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = true);
    filters = {
      types: ['aula','laboratorio','oficina','biblioteca','auditorio','comedor','deportivo','salon'],
      availability: ['available','unavailable','reserved'],
      floors: [0,1,2,3]
    };
    draw();
    showNotification('Filtros restablecidos');
  });

  // ── SCHEDULE PANEL ────────────────────────────────
  $('schedule-toggle').addEventListener('click', () => {
    $('schedule-panel').classList.toggle('hidden');
    $('filter-panel').classList.add('hidden');
    renderScheduleList();
  });

  $('schedule-close').addEventListener('click', () => $('schedule-panel').classList.add('hidden'));

  $('schedule-search-input').addEventListener('input', renderScheduleList);

  function renderScheduleList() {
    const q = ($('schedule-search-input').value || '').trim().toLowerCase();
    const list = FACULTY.filter(f => !q || f.name.toLowerCase().includes(q) || f.dept.toLowerCase().includes(q));

    $('schedule-list').innerHTML = list.map(f => {
      const slotsHTML = DAYS.map((day, i) => {
        const slots = f.schedule[i] || [];
        return `<div class="sc-slot ${slots.length ? '' : 'empty'}">${day.substring(0,2)}: ${slots.length ? slots.join(', ') : '---'}</div>`;
      }).join('');

      // Find their current room
      const room = allSpaces.find(s => s.teacher === f.id);
      const roomInfo = room ? ` - ${room.name} (P${room.floor})` : '';

      return `<div class="schedule-card" data-id="${f.id}">
        <div class="sc-name">${f.name}</div>
        <div class="sc-dept">${f.dept}${roomInfo}</div>
        <div class="sc-slots">${slotsHTML}</div>
      </div>`;
    }).join('');
  }

  $('schedule-list').addEventListener('click', e => {
    const card = e.target.closest('.schedule-card');
    if (!card) return;
    const fid = card.dataset.id;
    const room = allSpaces.find(s => s.teacher === fid);
    if (room) {
      // Switch to that floor and highlight
      if (room.floor !== currentFloor) {
        document.querySelectorAll('.floor-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.floor) === room.floor);
        });
        currentFloor = room.floor;
        spaces = buildSpaces(room.floor);
        $('current-floor-label').textContent = getFloorLabel();
      }
      selectedSpace = room;
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;
      panX = canvas.width / 2 - cx * zoom;
      panY = canvas.height / 2 - cy * zoom;
      draw();
      $('schedule-panel').classList.add('hidden');
    }
  });

  // ── RESERVATION MODAL ─────────────────────────────
  function openReservationModal(space) {
    if (!currentUser || currentUser.role === 'invitado') {
      showNotification('Inicia sesion para reservar espacios');
      return;
    }

    $('res-space').value = space.name;
    $('reservation-modal').classList.remove('hidden');

    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    $('res-date').min = today;
    $('res-date').value = today;

    // Populate time selects
    const startSel = $('res-start');
    const endSel = $('res-end');
    startSel.innerHTML = HOURS.map(h => `<option value="${h}">${h}</option>`).join('');
    endSel.innerHTML = HOURS.slice(1).map(h => `<option value="${h}">${h}</option>`).join('');
    endSel.innerHTML += `<option value="20:00">20:00</option>`;

    // Store space for submission
    $('reservation-modal')._space = space;
  }

  $('reservation-form').addEventListener('submit', e => {
    e.preventDefault();
    clearAllErrors();
    let valid = true;

    const date = $('res-date').value;
    const start = $('res-start').value;
    const end = $('res-end').value;
    const purpose = $('res-purpose').value.trim();
    const space = $('reservation-modal')._space;

    if (!date) { showError('res-date', 'Fecha requerida'); valid = false; }
    else {
      const d = new Date(date);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (d < today) { showError('res-date', 'No puedes reservar en el pasado'); valid = false; }
      if (d.getDay() === 0) { showError('res-date', 'El campus no abre domingos'); valid = false; }
    }

    if (!start) { showError('res-start', 'Hora requerida'); valid = false; }
    if (!end) { showError('res-end', 'Hora requerida'); valid = false; }

    if (start && end && start >= end) {
      showError('res-end', 'Debe ser posterior a la hora de inicio');
      valid = false;
    }

    if (!purpose) { showError('res-purpose', 'Motivo requerido'); valid = false; }
    else if (purpose.length < 3) { showError('res-purpose', 'Minimo 3 caracteres'); valid = false; }

    if (!valid) return;

    // Check for conflicts
    const conflict = reservations.find(r =>
      r.spaceId === space.id && r.date === date &&
      !(end <= r.start || start >= r.end)
    );

    if (conflict) {
      showError('res-start', 'Horario ocupado para esta fecha');
      return;
    }

    const res = {
      id: 'r' + Date.now(),
      spaceId: space.id,
      spaceName: space.name,
      userId: currentUser.id,
      userName: currentUser.name + ' ' + (currentUser.last || ''),
      date, start, end, purpose,
      createdAt: new Date().toISOString()
    };

    reservations.push(res);
    saveReservations(reservations);

    // Update space status
    space.status = 'reserved';

    $('reservation-modal').classList.add('hidden');
    $('reservation-form').reset();
    selectedSpace = null;
    hideTooltip();
    draw();
    showNotification(`Reserva confirmada: ${space.name} el ${date} de ${start} a ${end}`);
  });

  // Close modal
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.add('hidden');
    });
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // ── NOTIFICATION CLOSE ────────────────────────────
  $('notification-close').addEventListener('click', () => $('notification').classList.add('hidden'));

  // ── ANIMATION LOOP (for pulse) ────────────────────
  let animFrame;
  function animate() {
    draw();
    animFrame = requestAnimationFrame(animate);
  }

  // ── INIT ──────────────────────────────────────────
  resizeCanvas();
  animate();

})();
