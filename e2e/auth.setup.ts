import { test as setup } from "@playwright/test";
import { login } from "./login";

const authFile = "e2e/.auth/user.json";

// Every spec logging in separately quickly exceeds the login route's rate
// limit (5/min per IP, server/app.ts) once the suite has more than a
// handful of files. Log in once here and have every other project reuse
// the resulting session cookie via storageState.
setup("authenticate", async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: authFile });
});
