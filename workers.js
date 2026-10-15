
const USERS_KEY = "ft_team_users";
const TASKS_KEY = "ft_team_tasks";

let people = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
let teamTasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
let me = null;

function save() {
  localStorage.setItem(USERS_KEY, JSON.stringify(people));
  localStorage.setItem(TASKS_KEY, JSON.stringify(teamTasks));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function makeTeamCode() {
  return "FT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function roleFields() {
  const leader = document.getElementById("role").value === "leader";

  document.getElementById("codeField").classList.toggle("hidden", leader);

  document.getElementById("roleNote").innerHTML = leader
    ? "<b>Leader:</b> create tasks, assign workers, and track progress."
    : "<b>Worker:</b> enter your leader's team code to join the team.";
}

function showLogin() {
  document.getElementById("registerPanel").classList.add("hidden");
  document.getElementById("loginPanel").classList.remove("hidden");
}

function showRegister() {
  document.getElementById("registerPanel").classList.remove("hidden");
  document.getElementById("loginPanel").classList.add("hidden");
}

function register() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const teamCode = document.getElementById("teamCode").value.trim().toUpperCase();
  const msg = document.getElementById("registerMsg");

  msg.style.color = "var(--red)";
  msg.textContent = "";

  if (!name || !email || !password) {
    msg.textContent = "Please complete your name, email, and password.";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msg.textContent = "Enter a valid email address.";
    return;
  }

  if (password.length < 6) {
    msg.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (people.some(person => person.email === email)) {
    msg.textContent = "This email is already registered in the team portal.";
    return;
  }

  let leaderId = null;
  let team = "";

  if (role === "leader") {
    team = makeTeamCode();
  } else {
    const leader = people.find(person =>
      person.role === "leader" && person.teamCode === teamCode
    );

    if (!leader) {
      msg.textContent = "Team code not found. Ask your leader for the correct code.";
      return;
    }

    leaderId = leader.id;
    team = leader.teamCode;
  }

  people.push({
    id: "p" + Date.now() + Math.random().toString(36).slice(2, 6),
    name,
    email,
    password,
    role,
    leaderId,
    teamCode: team
  });

  save();

  msg.style.color = "var(--green)";
  msg.textContent = "Account created. Log in to continue.";

  document.getElementById("password").value = "";

  showLogin();
}

function login() {
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");

  msg.textContent = "";

  const user = people.find(person =>
    person.email === email && person.password === password
  );

  if (!user) {
    msg.textContent = "Email or password is incorrect, or you have not registered here.";
    return;
  }

  me = user;

  document.getElementById("auth").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("logoutBtn").classList.remove("hidden");

  render();
}

function getMembers() {
  if (me.role === "leader") {
    return people.filter(person =>
      person.role === "worker" && person.leaderId === me.id
    );
  }

  return people.filter(person =>
    person.role === "leader" && person.id === me.leaderId
  );
}

function getMyTasks() {
  if (me.role === "leader") {
    return teamTasks.filter(task => task.leaderId === me.id);
  }

  return teamTasks.filter(task => task.workerId === me.id);
}

function render() {
  if (!me) return;

  const leaderMode = me.role === "leader";
  const members = getMembers();
  const tasks = getMyTasks();

  document.getElementById("dashTitle").textContent =
    leaderMode ? "Leader Dashboard" : "Worker Dashboard";

  document.getElementById("dashSub").textContent = leaderMode
    ? "Create tasks, assign responsibilities, and manage your team."
    : "View assigned work and mark tasks complete.";

  document.getElementById("roleBadge").textContent =
    leaderMode ? "Leader / Administrator" : "Partner / Worker";

  document.getElementById("codeDisplay").textContent = me.teamCode || "—";

  document.getElementById("createPanel").classList.toggle("hidden", !leaderMode);

  document.getElementById("taskHeading").textContent =
    leaderMode ? "Tasks you created" : "Tasks assigned to me";

  document.getElementById("peopleHeading").textContent =
    leaderMode ? "Your workers" : "Your leader";

  document.getElementById("membersCount").textContent = members.length;
  document.getElementById("tasksCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent =
    tasks.filter(task => task.status === "Pending").length;
  document.getElementById("doneCount").textContent =
    tasks.filter(task => task.status === "Completed").length;

  if (leaderMode) {
    document.getElementById("assignee").innerHTML =
      '<option value="">Select a worker</option>' +
      members.map(person =>
        `<option value="${esc(person.id)}">${esc(person.name)} — ${esc(person.email)}</option>`
      ).join("");
  }

  document.getElementById("peopleList").innerHTML = members.length
    ? members.map(person => `
        <article class="item">
          <h3>${esc(person.name)}</h3>
          <p>${esc(person.email)}</p>
          <p class="meta">${leaderMode ? "Partner / Worker" : "Your team leader"}</p>
        </article>
      `).join("")
    : `<div class="empty">${
        leaderMode
          ? "No workers yet. Share your team code with them."
          : "Your leader account was not found in this browser."
      }</div>`;

  document.getElementById("tasksList").innerHTML = tasks.length
    ? tasks.slice().reverse().map(task => {
        const worker = people.find(person => person.id === task.workerId);
        const leader = people.find(person => person.id === task.leaderId);

        return `
          <article class="item">
            <div class="itemtop">
              <div>
                <h3>${esc(task.title)}</h3>
                <p>${esc(task.details)}</p>
              </div>
              <span class="status ${task.status === "Completed" ? "done" : ""}">
                ${esc(task.status)}
              </span>
            </div>

            <p class="meta">${
              leaderMode
                ? "Assigned to: " + esc(worker ? worker.name : "Worker")
                : "Created by: " + esc(leader ? leader.name : "Leader")
            }</p>

            <p>Due: ${
              task.due ? esc(new Date(task.due).toLocaleString()) : "No due date"
            }</p>

            ${
              !leaderMode && task.status !== "Completed"
                ? `<button class="btn gold small" style="margin-top:10px"
                    onclick="completeTask('${esc(task.id)}')">
                    Mark completed
                   </button>`
                : ""
            }
          </article>
        `;
      }).join("")
    : `<div class="empty">${
        leaderMode
          ? "No tasks yet. Add workers, then create your first task."
          : "No tasks assigned yet. Your leader will add them here."
      }</div>`;
}

function createTask() {
  if (!me || me.role !== "leader") return;

  const title = document.getElementById("taskTitle").value.trim();
  const details = document.getElementById("taskDetails").value.trim();
  const workerId = document.getElementById("assignee").value;
  const dueValue = document.getElementById("due").value;
  const msg = document.getElementById("taskMsg");

  msg.style.color = "var(--red)";
  msg.textContent = "";

  if (!title || !details || !workerId) {
    msg.textContent = "Enter a title and details, then select a worker.";
    return;
  }

  const workerExists = people.some(person =>
    person.id === workerId && person.leaderId === me.id
  );

  if (!workerExists) {
    msg.textContent = "Select a worker from your team.";
    return;
  }

  if (dueValue && new Date(dueValue).getTime() <= Date.now()) {
    msg.textContent = "Choose a future due date and time.";
    return;
  }

  teamTasks.push({
    id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
    leaderId: me.id,
    workerId,
    title,
    details,
    due: dueValue ? new Date(dueValue).toISOString() : "",
    status: "Pending",
    createdAt: new Date().toISOString()
  });

  save();

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDetails").value = "";
  document.getElementById("due").value = "";

  render();

  msg.style.color = "var(--green)";
  msg.textContent = "Task created and assigned.";
}

function completeTask(id) {
  if (!me || me.role !== "worker") return;

  const task = teamTasks.find(task =>
    task.id === id && task.workerId === me.id
  );

  if (task) {
    task.status = "Completed";
    save();
    render();
  }
}

function copyCode() {
  if (!me || !me.teamCode) return;

  const code = me.teamCode;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code)
      .then(() => alert("Team code copied."))
      .catch(() => prompt("Copy your team code:", code));
  } else {
    prompt("Copy your team code:", code);
  }
}

function logout() {
  me = null;

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");
  document.getElementById("logoutBtn").classList.add("hidden");
  document.getElementById("loginPassword").value = "";

  showLogin();
}

roleFields();
