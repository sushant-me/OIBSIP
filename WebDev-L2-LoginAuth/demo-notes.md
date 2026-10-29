# Latch — demo notes

Steps to show every feature. Run `python3 -m http.server 8000` in this folder and open
<http://localhost:8000/>.

1. **First load** — the sign-in page appears. The small "Demo account" box says a seeded
   account exists: `demo` / `Demo1234`.
2. **Empty sign-in** — click Sign in with both fields empty: "Enter your username or email."
   and "Enter your password." appear under the fields.
3. **Generic error** — type `demo` and `WrongPass1`, click Sign in. The banner says only
   "We couldn't sign you in…". Try `nobody` with any password: the same text appears, so the
   page never says which field was wrong.
4. **Show/hide password** — click the eye button; the password becomes readable, the icon
   changes and `aria-pressed` flips. Click again to hide it.
5. **Demo login** — click **Use demo account** (fills the fields) then **Sign in**. The
   dashboard opens.
6. **Dashboard details** — point out the username, email, member-since and session-start
   values. In "How your password is stored", show the SHA-256 algorithm, 1,000 iterations,
   the 32-character salt and the hash prefix. Expand **Show the stored user record** — it
   has salt and hash but no password.
7. **Storage check (optional)** — DevTools → Application → Session Storage shows the
   `latch.session.v1` key; Local Storage → `latch.users.v1` shows the hashed record only.
8. **Protected route** — copy `dashboard.html` into a new tab. It redirects to the sign-in
   page, because sessionStorage belongs to the original tab.
9. **Logout** — click Logout in the dashboard header. You return to sign-in with "You have
   been signed out." Pressing Back does not reopen the dashboard.
10. **Registration empty state** — open **Create an account** and click Register with all
    fields empty: each field shows its own error.
11. **Password rules** — type a password with a number but fewer than 8 characters (`abc123`):
    the "8 characters" rule stays unticked. Make it 8+ characters (`abc12345`): both rules
    tick and the strength meter scores it.
12. **Duplicates** — try username `demo`: "That username is already registered." Try
    `demo@latch.dev` as the email: the email error appears.
13. **Register** — use a new username, a new email, `Password123` and the same confirmation;
    click Register. The sign-in page shows "Account created."
14. **New account login** — sign in with the new username and password. The dashboard now
    shows that account.
15. **Expired session** — on the dashboard, click **Simulate an expired session**. The
    session is cleared, the page reloads, and the route guard sends you to sign-in.
16. **Responsive** — resize to 360×640, 768×1024 and 1440×900: the marketing column hides,
    the card stays centred, and there is no horizontal scroll.

To reset the demo, clear site data for the origin (this removes the seeded account, and it
is created again on the next load).
