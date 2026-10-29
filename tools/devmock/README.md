# Walking the app with fake data (local only)

Lets you open every screen on your own computer, as a hunter, an outfitter or staff, with made-up data and no real sign-in.
Nothing here is part of the app that goes live.

1. Copy `devmock.js` to `public/__devmock.js`.
2. In `index.html`, add `<script src="/__devmock.js"></script>` just above the `<script type="module" src="/src/main.tsx">` line.
3. Start the dev server (`pnpm dev`) and, in the browser console, choose who you are, then reload:
   - Hunter:    `localStorage.setItem('__scenario','hunter'); localStorage.setItem('apex_portal','hunter'); localStorage.removeItem('apex_dev_admin')`
   - Outfitter: `localStorage.setItem('__scenario','outfitter'); localStorage.setItem('apex_portal','outfitter'); localStorage.removeItem('apex_dev_admin')`
   - Staff:     `localStorage.setItem('__scenario','staff'); localStorage.setItem('apex_portal','admin'); localStorage.setItem('apex_dev_admin','1')` and remove the key `sb-<project ref>-auth-token`
   - Invitation page: `localStorage.setItem('__scenario','invite')` then open `/?invite=abc`
   - Turn it off: `localStorage.removeItem('__scenario')`
4. When finished, delete `public/__devmock.js` and take the script tag out of `index.html`. Never commit them.

The script answers the database calls the screens make (tables and functions) from the lists at the top of the file, so a screen that
shows nothing or crashes with this data usually means the screen expects a different shape than the database sends.
`window.__log` lists every call the page made.
