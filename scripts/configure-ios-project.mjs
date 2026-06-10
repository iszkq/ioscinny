import fs from 'node:fs';
import path from 'node:path';

const defaultPlistPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Info.plist');
const plistPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPlistPath;

const privacyStrings = [
  ['NSCameraUsageDescription', '\u62cd\u7167\u53d1\u9001\u548c\u5f55\u50cf\u53d1\u9001\u9700\u8981\u4f7f\u7528\u7cfb\u7edf\u76f8\u673a\u3002'],
  ['NSMicrophoneUsageDescription', '\u5f55\u50cf\u53d1\u9001\u3001\u8bed\u97f3\u53d1\u9001\u548c\u8bed\u97f3\u529f\u80fd\u9700\u8981\u4f7f\u7528\u9ea6\u514b\u98ce\u3002'],
  ['NSPhotoLibraryUsageDescription', '\u53d1\u9001\u56fe\u7247\u3001\u89c6\u9891\u548c\u6587\u4ef6\u65f6\u9700\u8981\u8bbf\u95ee\u7167\u7247\u4e0e\u5a92\u4f53\u8d44\u6599\u3002'],
  ['NSSpeechRecognitionUsageDescription', '\u8bed\u97f3\u542c\u5199\u9700\u8981\u4f7f\u7528\u7cfb\u7edf\u8bed\u97f3\u8bc6\u522b\u3002'],
];

if (!fs.existsSync(plistPath)) {
  throw new Error(`Info.plist not found: ${plistPath}`);
}

const original = fs.readFileSync(plistPath, 'utf8');
let updated = original;

for (const [key, value] of privacyStrings) {
  updated = upsertPlistString(updated, key, value);
}

if (updated !== original) {
  fs.writeFileSync(plistPath, updated, 'utf8');
}

console.log(`${updated === original ? 'Verified' : 'Updated'} iOS privacy usage strings in ${plistPath}`);

function upsertPlistString(xml, key, value) {
  const block = `\t<key>${key}</key>\n\t<string>${escapeXml(value)}</string>`;
  const pattern = new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>[\\s\\S]*?<\\/string>`);

  if (pattern.test(xml)) {
    return xml.replace(pattern, block);
  }

  const insertAt = xml.lastIndexOf('</dict>');
  if (insertAt === -1) {
    throw new Error(`Unable to locate </dict> in ${plistPath}`);
  }

  return `${xml.slice(0, insertAt)}${block}\n${xml.slice(insertAt)}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
