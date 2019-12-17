const fs = require('fs');
const path = require('path');

const DIRECTORY = "cache"

fs.readdir(DIRECTORY, (err, files) => {
    if(err) console.error(err)

    for(let file of files) {
        if(file !== ".gitkeep") {
            fs.unlink(path.join(DIRECTORY, file), err => {
                if (err) console.error(err)
            })
        }
    }
})