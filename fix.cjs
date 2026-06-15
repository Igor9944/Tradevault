const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/\baccountId\b/g, 'account_id');
  content = content.replace(/\bdailyLoss\b/g, 'daily_loss');
  content = content.replace(/\bglobalLoss\b/g, 'global_loss');
  content = content.replace(/\bpaidUntil\b/g, 'paid_until');
  content = content.replace(/\bpaymentScreenshot\b/g, 'payment_proof');
  content = content.replace(/\bproofScreenshot\b/g, 'payment_proof');
  content = content.replace(/\bgoogleLinked\b/g, 'google_linked');
  content = content.replace(/\bgoogleEmail\b/g, 'google_email');
  content = content.replace(/\buserId\b/g, 'user_id');
  content = content.replace(/\.type === 'propfirm'/g, ".account_type === 'prop_firm'");
  content = content.replace(/\.type === "propfirm"/g, '.account_type === "prop_firm"');
  content = content.replace(/type: 'propfirm'/g, "account_type: 'prop_firm'");
  content = content.replace(/type: "propfirm"/g, 'account_type: "prop_firm"');
  content = content.replace(/\.type === 'personal'/g, ".account_type === 'personal'");
  content = content.replace(/\.type === "personal"/g, '.account_type === "personal"');
  content = content.replace(/type: 'personal'/g, "account_type: 'personal'");
  content = content.replace(/type: "personal"/g, 'account_type: "personal"');
  content = content.replace(/newAccType/g, "newAccType");
  content = content.replace(/newAccType === 'propfirm'/g, "newAccType === 'prop_firm'");
  content = content.replace(/newAccType === "propfirm"/g, 'newAccType === "prop_firm"');
  
  // Custom types
  content = content.replace(/type: newAccType/g, "account_type: newAccType");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

traverse(path.join(__dirname, 'src'));
