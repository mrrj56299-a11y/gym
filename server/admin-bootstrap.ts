import { promoteFirstAdmin } from "./db";
const email=process.argv[2]?.trim();
if(!email||!/^[-A-Z0-9._+]+@[-A-Z0-9.]+\.[A-Z]{2,}$/i.test(email)){console.error("Usage: pnpm admin:bootstrap -- <verified-account-email>");process.exit(2)}
try{const id=await promoteFirstAdmin(email);console.log(`Administrator role granted to the existing account (user id ${id}). First-admin bootstrap is now permanently closed.`)}catch(error){console.error(error instanceof Error?error.message:"Administrator bootstrap failed");process.exit(1)}
