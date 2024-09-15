const express = require('express');
const path = require('path')
const app = express();
let fs = require('fs')

const { Server } = require('socket.io');

let PORT = 3000
let FILE_PATH = path.join(__dirname,'logfile.log')

const server = app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`);
})


const io = new Server(server);


let lastTenLinesQueue = []

//For Update queue after updation of logfile
function updateLastLineQueue(line){
    if(lastTenLinesQueue.length>=10){
        lastTenLinesQueue.shift()
    }
    lastTenLinesQueue.push(line)
    console.log('hello');
}

//Set line 10 lines in queue Globally
// Intialize when server starts
function setLastTenLines(){
    fs.readFile(FILE_PATH, 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          console.log('moto-gp');
          return;
        }
        // console.log(data);
        let file_data = data.trim().split('\n')
        let last_lines = file_data.slice(-10)

        last_lines.forEach(line => {
             lastTenLinesQueue.push(line)
        })
    });
}

//To initialize file_watcher only once
//As soon as file updated watcher will emit updated data
let flag_watcher = false;
function fileWatcher(){
    if(flag_watcher) return;

    flag_watcher = true;

    //Watch File will track the file as soon as it got updated function will invoke
    fs.watchFile(FILE_PATH,{interval:10},(curr, prev)=>{
        if(curr.size>prev.size){
            let stream = fs.createReadStream(FILE_PATH,{
                start: prev.size,
                end:curr.size,
            })

            stream.on('data',(chunk)=>{
                // console.log(chunk);

                let new_lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
                
                new_lines.forEach(line => {
                    //updating the queue
                    updateLastLineQueue(line);
                })

                //Emitting data to all the clients
                io.emit('updatelog',new_lines)
            })
        }
    })
}

io.on('connection', (socket) => {
    console.log('New user connected');
    
    //Initially emitting last 10 lines of log file
    socket.emit('initiallog',lastTenLinesQueue)

    fileWatcher()

    socket.on('disconnect',()=>{
        console.log('Client Disconnected');
    })
});
setLastTenLines()

app.get('/log', (req, res) => {
    res.sendFile(path.join(__dirname,'log.html'))
});
  