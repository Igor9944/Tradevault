import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/\.from\('users'\)/g, ".from('profiles')");
content = content.replace(/\.from\('accounts'\)/g, ".from('trading_accounts')");
content = content.replace(/\.from\('payments'\)/g, ".from('payment_requests')");
content = content.replace(/proof_file_url/g, "payment_proof");
content = content.replace(/proof_url/g, "payment_proof");
content = content.replace(/payment_date/g, "created_at"); // assuming created_at is the standard

fs.writeFileSync('server.ts', content);

let content2 = fs.readFileSync('src/utils/supabaseSync.ts', 'utf8');
content2 = content2.replace(/\.from\('users'\)/g, ".from('profiles')");
content2 = content2.replace(/\.from\('accounts'\)/g, ".from('trading_accounts')");
content2 = content2.replace(/\.from\('payments'\)/g, ".from('payment_requests')");
content2 = content2.replace(/proof_file_url/g, "payment_proof");
content2 = content2.replace(/proof_url/g, "payment_proof");
content2 = content2.replace(/payment_date/g, "created_at");
// update user table to profiles
content2 = content2.replace(/users \(/g, "profiles (");

fs.writeFileSync('src/utils/supabaseSync.ts', content2);
console.log("done");
