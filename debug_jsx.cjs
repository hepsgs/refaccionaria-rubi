
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hepsg\\Downloads\\refaccionariarubi\\refaccionaria-rubi\\src\\pages\\Admin.tsx', 'utf8');

const lines = content.split('\n');
let stack = [];
let inJSX = false;
let startLine = 166; // Admin return starts around here

for (let i = startLine - 1; i < lines.length; i++) {
    const line = lines[i];
    const openTags = line.match(/<[a-zA-Z0-9]+[^>]*[^/]>/g) || [];
    const closeTags = line.match(/<\/[a-zA-Z0-9]+>/g) || [];

    openTags.forEach(tag => {
        const tagName = tag.match(/<([a-zA-Z0-9]+)/)[1];
        stack.push({ tag: tagName, line: i + 1 });
    });

    closeTags.forEach(tag => {
        const tagName = tag.match(/<\/([a-zA-Z0-9]+)/)[1];
        if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
            stack.pop();
        } else {
            console.log(`Error: Mismatched close tag </${tagName}> at line ${i + 1}. Expected </${stack.length > 0 ? stack[stack.length - 1].tag : 'NONE'}>`);
        }
    });

    if (line.includes(');')) {
        console.log(`End of return block at line ${i + 1}. Stack size: ${stack.length}`);
        if (stack.length > 0) {
            console.log('Unclosed tags:');
            stack.forEach(s => console.log(`  <${s.tag}> at line ${s.line}`));
        }
        // If we found the end of Admin, we can stop or reset for next component
        if (i > 900) break;
    }
}
