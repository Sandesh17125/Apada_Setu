/* ---------------------------------------------------------
   Prototype auth layer.
   IMPORTANT: this stores accounts in the browser's localStorage
   with PLAINTEXT passwords. That is fine for a hackathon demo
   running only on your machine, but it is NOT secure and must
   NOT be used as-is in production. For a real deployment, move
   signup/login to the backend, hash passwords (bcrypt/argon2),
   and issue proper session tokens (JWT) instead.
--------------------------------------------------------- */

const USERS_KEY = "apadaSetu_users";
const SESSION_KEY = "apadaSetu_session";

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function setSession(user) {
  const session = { name: user.name, email: user.email, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signUp({ name, email, password, role }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalizedEmail)) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }
  const newUser = { name: name.trim(), email: normalizedEmail, password, role };
  users.push(newUser);
  writeUsers(users);
  return { user: setSession(newUser) };
}

export function signIn({ email, password }) {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const found = users.find((u) => u.email === normalizedEmail);
  if (!found) {
    return { error: "No account found with this email. Try signing up first." };
  }
  if (found.password !== password) {
    return { error: "Incorrect password." };
  }
  return { user: setSession(found) };
}
