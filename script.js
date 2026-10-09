let users = JSON.parse(localStorage.getItem("ft_users") || "[]");
let tasks = JSON.parse(localStorage.getItem("ft_tasks") || "[]");
let currentUser = null;
let currentView = "all";
let reminded = JSON.parse(sessionStorage.getItem("ft_reminded") || "[]");

function save() {
  localStorage.setItem("ft_users", JSON.stringify(users));
  localStorage.setItem("ft_tasks", JSON.stringify(tasks));
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}

function switchAuth(type) {
  document.getElementById("loginForm").classList.toggle("hidden", type !== "login");
  document.getElementById("signupForm").classList.toggle("hidden", type !== "signup");
  document.getElementById("loginTab").classList.toggle("active", type === "login");
  document.getElementById("signupTab").classList.toggle("active", type === "signup");
}

function signup() {
  let name = document.getElementById("signupName").value.trim();
  let email = document.getElementById("signupEmail").value.trim().toLowerCase();
  let password = document.getElementById("signupPassword").value;
  let ageText = document.getElementById("signupAge").value;
  let age = Number(ageText);
  let error = document.getElementById("signupError");

  error.style.color = "#ff777d";
  error.textContent = "";

  if (!name || !email || !password || !ageText) {
    error.textContent = "Please complete every field.";
    return;
  }

  
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.textContent = "Enter a valid email address.";
    return;
  }

  if (age < 14 || !Number.isInteger(age)) {
    error.textContent = "You must be at least 14 years old.";
    return;
  }

  if (password.length < 6) {
    error.textContent = "Your password must be at least 6 characters.";
    return;
  }

  if (users.some(u => u.email === email)) {
    error.textContent = "This email is already registered.";
    return;
  }

  users.push({
    id: Date.now() + Math.random(),
    name,
    email,
    password,
    age,
    role: "user",
    tokens: 6
  });

  save();
  error.style.color = "#65d6a1";
  error.textContent = "Registration complete. You can now log in.";
  document.getElementById("signupPassword").value = "";
  switchAuth("login");
}

function login() {
  let email = document.getElementById("loginEmail").value.trim().toLowerCase();
  let password = document.getElementById("loginPassword").value;
  let error = document.getElementById("loginError");

  if (!email || !password) {
    error.textContent = "Enter your email and password.";
    return;
  }

  let user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    error.textContent = "Incorrect email or password.";
    return;
  }

  currentUser = user;
  document.getElementById("welcome").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  if (user.role === "admin") {
    document.getElementById("adminNav").classList.remove("hidden");
  }

  renderDashboard();
}

function renderDashboard() {
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileEmail").textContent = currentUser.email;
  document.getElementById("avatar").textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById("tokenCount").textContent = currentUser.tokens;
  document.getElementById("sideTotal").textContent = tasks.filter(t => t.userId === currentUser.id).length;

  let mine = tasks.filter(t => t.userId === currentUser.id);
  let done = mine.filter(t => t.status === "Completed").length;
  let percent = mine.length ? Math.round(done / mine.length * 100) : 0;

  document.getElementById("progressNumber").textContent = percent + "%";
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("totalCount").textContent = mine.length;
  document.getElementById("activeCount").textContent = mine.filter(t => t.status === "Pending").length;
  document.getElementById("doneCount").textContent = done;

  renderTasks();
}

function setView(view, button) {
  currentView = view;
  document.querySelectorAll(".nav").forEach(n => n.classList.remove("active"));
  button.classList.add("active");

  let titles = {
    all: ["All Tasks", "Plan your day and keep your flow moving."],
    today: ["Today", "Focus on what needs to be done today."],
    completed: ["Completed", "Look at everything you have accomplished."]
  };

  document.getElementById("pageTitle").textContent = titles[view][0];
  document.getElementById("crumb").textContent = titles[view][0];
  document.getElementById("pageDescription").textContent = titles[view][1];
  renderTasks();
}

function renderTasks() {
  if (!currentUser) return;

  let search = document.getElementById("search").value.toLowerCase();
  let sort = document.getElementById("sort").value;
  let mine = tasks.filter(t => t.userId === currentUser.id);

  if (currentView === "today") {
    mine = mine.filter(t => t.time && new Date(t.time).toDateString() === new Date().toDateString());
  }

  if (currentView === "completed") {
    mine = mine.filter(t => t.status === "Completed");
  }

  mine = mine.filter(t => (t.title + " " + t.description).toLowerCase().includes(search));

  if (sort === "new") mine.sort((a,b) => b.id - a.id);
  if (sort === "old") mine.sort((a,b) => a.id - b.id);
  if (sort === "priority") mine.sort((a,b) => ["High","Medium","Low"].indexOf(a.priority) - ["High","Medium","Low"].indexOf(b.priority));

  document.getElementById("taskList").innerHTML = mine.map(t => `
    <div class="task ${t.status === "Completed" ? "completed" : ""}">
      <button class="task-check ${t.status === "Completed" ? "done" : ""}" onclick="toggleTask('${t.id}')">${t.status === "Completed" ? "✓" : ""}</button>
      <div class="task-content">
        <h3>${safe(t.title)}</h3>
        <p>${safe(t.description)}</p>
        <p class="task-time">${t.time ? "◷ " + safe(new Date(t.time).toLocaleString()) : "No reminder set"}</p>
      </div>
      <span class="priority ${(t.priority || "Medium").toLowerCase()}">${safe(t.priority || "Medium")}</span>
      <button class="delete-task" onclick="deleteTask('${t.id}')">×</button>
    </div>
  `).join("");

  document.getElementById("emptyState").classList.toggle("hidden", mine.length > 0);
}

function openTask() {
  document.getElementById("modalError").textContent = "";
  document.getElementById("taskModal").classList.remove("hidden");
}

function closeTask() {
  document.getElementById("taskModal").classList.add("hidden");
}

function createTask() {
  let title = document.getElementById("newTitle").value.trim();
  let description = document.getElementById("newDescription").value.trim();
  let priority = document.getElementById("newPriority").value;
  let time = document.getElementById("newTime").value;
  let error = document.getElementById("modalError");

  error.style.color = "#ff777d";

  if (!title || !description || !time) {
    error.textContent = "Please complete all task fields.";
    return;
  }

  if (new Date(time).getTime() <= Date.now()) {
    error.textContent = "Choose a future reminder time.";
    return;
  }

  if (currentUser.tokens <= 0) {
    error.textContent = "You have no tokens left.";
    return;
  }

  tasks.push({
    id: String(Date.now() + Math.random()),
    userId: currentUser.id,
    userName: currentUser.name,
    title,
    description,
    priority,
    time: new Date(time).toISOString(),
    status: "Pending"
  });

  currentUser.tokens--;
  let index = users.findIndex(u => u.id === currentUser.id);
  if (index !== -1) users[index] = currentUser;

  save();
  document.getElementById("newTitle").value = "";
  document.getElementById("newDescription").value = "";
  document.getElementById("newTime").value = "";
  closeTask();
  renderDashboard();
}

function toggleTask(id) {
  let task = tasks.find(t => String(t.id) === String(id) && t.userId === currentUser.id);
  if (!task) return;
  task.status = task.status === "Completed" ? "Pending" : "Completed";
  save();
  renderDashboard();
}

function deleteTask(id) {
  tasks = tasks.filter(t => !(String(t.id) === String(id) && t.userId === currentUser.id));
  save();
  renderDashboard();
}

function showAdmin() {
  if (!currentUser || currentUser.role !== "admin") return;

  document.getElementById("adminUsers").innerHTML = users.map(u => `
    <div class="admin-row"><b>${safe(u.name)}</b><p>${safe(u.email)} · ${safe(u.role)} · ${u.tokens} tokens</p></div>
  `).join("") || "No users yet.";

  document.getElementById("adminTasks").innerHTML = tasks.map(t => `
    <div class="admin-row"><b>${safe(t.title)}</b><p>${safe(t.userName)} · ${safe(t.status)} · ${safe(t.priority || "Medium")}</p><p>${safe(t.description)}</p><p>Reminder: ${t.time ? safe(new Date(t.time).toLocaleString()) : "None"}</p></div>
  `).join("") || "No tasks yet.";

  document.getElementById("adminModal").classList.remove("hidden");
}

function closeAdmin() {
  document.getElementById("adminModal").classList.add("hidden");
}

function logout() {
  currentUser = null;
  document.getElementById("app").classList.add("hidden");
  document.getElementById("welcome").classList.remove("hidden");
  document.getElementById("adminModal").classList.add("hidden");
  document.getElementById("loginPassword").value = "";
  switchAuth("login");
}

function checkReminders() {
  if (!currentUser) return;

  tasks.forEach(t => {
    if (t.userId !== currentUser.id || t.status !== "Pending" || !t.time) return;
    if (new Date(t.time).getTime() <= Date.now() && !reminded.includes(t.id)) {
      reminded.push(t.id);
      sessionStorage.setItem("ft_reminded", JSON.stringify(reminded));
      alert("Flow Tasks reminder: " + t.title);
    }
  });
}

setInterval(checkReminders, 10000);

  
const tokenPriceNaira = 20000;
const nairaPerDollar = 1330;

const tokenPriceDollar = tokenPriceNaira / nairaPerDollar;
const dollarDisplay = document.getElementById("tokenUsdPrice");

if (dollarDisplay) {
  dollarDisplay.textContent = "$" + tokenPriceDollar.toFixed(2);
}


const authTokenGrid = document.getElementById("authTokenGrid");

if (authTokenGrid) {
  for (let token = 10; token <= 100; token += 2) {
    const naira = token * 200;
    const dollars = (naira / 1330).toFixed(2);

    authTokenGrid.innerHTML += `
      <div class="auth-token-card">
        <h3>${token} Tokens</h3>
        <strong>₦${naira.toLocaleString("en-NG")}</strong>
        <p>$${dollars}</p>
      </div>
    `;
  }
}