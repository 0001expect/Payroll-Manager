
const fs = require('fs').promises;
const path = require('path');

const filePath = path.join(__dirname, '../employees.json');

// Read employee data from the JSON file.
async function read() {
    try {
        const data = await fs.readFile(filePath, 'utf-8');

        // Return an empty array if the file is empty.
        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);

    } catch (err) {

        // Return an empty array only if the file doesn't exist.
        if (err.code === 'ENOENT') {
            return [];
        }

        // Pass other errors to the server.
        throw err;
    }
}

// Save employee data to the JSON file.
async function write(data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = { read, write };
