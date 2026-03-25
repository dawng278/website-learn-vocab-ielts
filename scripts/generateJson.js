const fs = require('fs');
const path = require('path');

const vocabDir = path.join(__dirname, '..', 'public', 'vocab');
const files = fs.readdirSync(vocabDir).filter(f => f.endsWith('.csv'));
const allTopics = [];

for (const filename of files) {
    const topicName = filename.replace('.csv', '').replace('IELTS_', '').replace(/_/g, ' ');
    const content = fs.readFileSync(path.join(vocabDir, filename), 'utf8');
    const words = content.split('\n').map(line => {
        const p = line.split(',');
        return p.length >= 2 ? { en: p[0].trim(), vi: p[1].trim() } : null;
    }).filter(w => w !== null);

    if (words.length > 0) {
        allTopics.push({
            topic: topicName,
            words: words,
            isSystem: true,
            filename: filename
        });
    }
}

fs.writeFileSync(path.join(__dirname, '..', 'all_topics.json'), JSON.stringify(allTopics, null, 2));
console.log('File all_topics.json has been created at d:\\tools\\learn-vocab\\all_topics.json');
console.log('Now you can IMPORT this file in MongoDB Compass!');
