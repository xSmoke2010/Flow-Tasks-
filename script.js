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
 
function signupRoleFields() {
  const type = document.getElementById("signupRole").value;

  document.getElementById("signupTeamCodeField")
    .classList.toggle("hidden", type === "leader");
}

function signup() {
  let name = document.getElementById("signupName").value.trim();
  let email = document.getElementById("signupEmail").value.trim().toLowerCase();
  let password = document.getElementById("signupPassword").value;
  let ageText = document.getElementById("signupAge").value;
  let age = Number(ageText);
  let accountType = document.getElementById("signupRole").value;
  let enteredCode = document.getElementById("signupTeamCode").value.trim().toUpperCase();
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

  let teamPeople = JSON.parse(localStorage.getItem("ft_team_users") || "[]");

  if (teamPeople.some(p => p.email === email)) {
    error.textContent = "This email is already registered.";
    return;
  }

  let leader = null;
  let teamCode = "";

  if (accountType === "leader") {
    teamCode = "FT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  } else {
    if (!enteredCode) {
      error.textContent = "Enter your leader's team code.";
      return;
    }

    leader = teamPeople.find(
      p => p.role === "leader" && p.teamCode === enteredCode
    );

    if (!leader) {
      error.textContent = "Invalid team code. Please check with your leader.";
      return;
    }

    teamCode = leader.teamCode;
  }

  let id = "ft" + Date.now() + Math.random().toString(36).slice(2, 7);

  users.push({
    id,
    name,
    email,
    password,
    age,
    role: "user",
    accountType,
    teamCode,
    tokens: 6
  });

  save();

  teamPeople.push({
    id,
    name,
    email,
    password,
    role: accountType === "leader" ? "leader" : "worker",
    leaderId: leader ? leader.id : null,
    teamCode
  });

  localStorage.setItem("ft_team_users", JSON.stringify(teamPeople));

  document.getElementById("signupPassword").value = "";
  document.getElementById("signupTeamCode").value = "";

  error.style.color = "#65d6a1";
  error.textContent = "Registration complete.";

  switchAuth("login");

  if (accountType === "leader") {
    alert("Account created! Your team code is: " + teamCode +
      "\nSave it and share it with your workers.");
  } else {
    alert("Account created! You can now log in.");
  }
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

  document.getElementById("adminUserCount").textContent = users.length;
  document.getElementById("adminRoleCount").textContent = users.filter(u => u.role === "admin").length;
  document.getElementById("adminTokenCount").textContent = users.reduce((total, u) => total + Number(u.tokens || 0), 0);
  document.getElementById("adminTaskCount").textContent = tasks.length;
  document.getElementById("adminUserMessage").textContent = "";
  renderAdminUsers();

  document.getElementById("adminTasks").innerHTML = tasks.map(t => `
    <div class="admin-row"><b>${safe(t.title)}</b><p>${safe(t.userName)} · ${safe(t.status)} · ${safe(t.priority || "Medium")}</p><p>${safe(t.description)}</p><p>Reminder: ${t.time ? safe(new Date(t.time).toLocaleString()) : "None"}</p></div>
  `).join("") || "No tasks yet.";

  document.getElementById("adminModal").classList.remove("hidden");
}

function renderAdminUsers() {
  if (!currentUser || currentUser.role !== "admin") return;

  let search = document.getElementById("adminUserSearch").value.trim().toLowerCase();
  let role = document.getElementById("adminRoleFilter").value;
  let matchingUsers = users
    .map((user, index) => ({ user, index }))
    .filter(({ user }) => {
      let matchesSearch = (user.name + " " + user.email).toLowerCase().includes(search);
      return matchesSearch && (role === "all" || user.role === role);
    });

  document.getElementById("adminUsers").innerHTML = matchingUsers.map(({ user, index }) => `
    <div class="admin-user-row">
      <div class="admin-user-identity">
        <div class="avatar">${safe(user.name.charAt(0).toUpperCase())}</div>
        <div><b>${safe(user.name)}</b><small>${safe(user.email)}</small></div>
      </div>
      <label class="admin-field">
        <span>Role</span>
        <select id="adminRole-${index}" aria-label="Role for ${safe(user.name)}" ${user.id === currentUser.id ? "disabled" : ""}>
          <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </label>
      <label class="admin-field admin-token-field">
        <span>Tokens</span>
        <input id="adminTokens-${index}" type="number" min="0" step="1" value="${safe(user.tokens)}" aria-label="Token balance for ${safe(user.name)}">
      </label>
      <button class="admin-save" onclick="updateAdminUser(${index})">Save</button>
    </div>
  `).join("") || '<p class="admin-empty">No users match your search.</p>';
}

function updateAdminUser(index) {
  if (!currentUser || currentUser.role !== "admin") return;

  let user = users[index];
  let roleInput = document.getElementById("adminRole-" + index);
  let tokensInput = document.getElementById("adminTokens-" + index);
  let message = document.getElementById("adminUserMessage");

  if (!user || !roleInput || !tokensInput) return;

  let tokens = Number(tokensInput.value);
  message.style.color = "#ff777d";

  if (!tokensInput.value.trim() || !Number.isSafeInteger(tokens) || tokens < 0) {
    message.textContent = "Token balances must be a whole number of zero or more.";
    return;
  }

  if (roleInput.value !== "admin" && roleInput.value !== "user") {
    message.textContent = "Choose a valid user role.";
    return;
  }

  if (user.role === "admin" && roleInput.value === "user" &&
      users.filter(account => account.role === "admin").length <= 1) {
    message.textContent = "At least one administrator must remain.";
    return;
  }

  user.role = roleInput.value;
  user.tokens = tokens;
  save();
  document.getElementById("adminUserCount").textContent = users.length;
  document.getElementById("adminRoleCount").textContent = users.filter(account => account.role === "admin").length;
  document.getElementById("adminTokenCount").textContent = users.reduce((total, account) => total + Number(account.tokens || 0), 0);
  message.style.color = "#65d6a1";
  message.textContent = "User account updated.";
  renderAdminUsers();
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