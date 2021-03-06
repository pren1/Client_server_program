var express = require('express');
const io = require('socket.io-client')
const socket = io('https://api.vtbs.moe')

const IO_Server = require('socket.io')
// const dispatch = new Server(9003, { serveClient: false })
const rooms = new Set()
var app = express()
var server = app.listen(9003, function(){
  console.log("Node.js server created");
})
app.use(express.static('front-end'))
var io_= IO_Server(server, {pingTimeout: 5000});
var global_sid = -1

io_.on('connection', function (socket) {
  console.log('socket.io connected with python_interface program ' + socket.id)
  io_.emit("Client_room_list", Array.from(rooms));
  global_sid = socket.id
  socket.on('watch_room', function (data) {
    console.log(`Server: You should watch room ${data}`)
    watch({ roomid: data, mid: 123 })
    io_.emit("Client_room_list", Array.from(rooms));
  })

  socket.on('close_room', function (data) {
    console.log(`Server: You should close room ${data}`)
    close_target_room(data)
    io_.emit("Client_room_list", Array.from(rooms));
  })

  socket.on('disconnect', function() {
      console.log('Got disconnect!');
   });
  socket.on("ping", function(data) {
    // console.log("Received message")
    console.log(data)
    io_.emit("Pong", new Date().getTime());
    calibrate_room_list()
    // watch({roomid: 14085407, mid: 123})
  })
})

// const { LiveWS } = require('bilibili-live-ws')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const got = require('got')
const { KeepLiveWS } = require('bilibili-live-ws')
const { getConf: getConfW } = require('bilibili-live-ws/extra')
const no = require('./env')

const on_live_rooms = []
const waiting = []
const opened = new Set()
const lived = new Set()
const printStatus = () => {
  // 如果不要打印连接状况就注释掉下一行
  console.log(`living/opening/non_unqie: ${lived.size}/${opened.size}/${on_live_rooms.length}`)
}

function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }
    return true;
}

function extract_non_unique_room_from_onliverooms (){
  var non_unique_room_array = []
  for (let i=0; i < on_live_rooms.length; i++){
    non_unique_room_array.push(on_live_rooms[i].name)
  }
  return non_unique_room_array
}

const calibrate_room_list = () => {
  console.log(`living/opening/non_unqie: ${lived.size}/${opened.size}/${on_live_rooms.length}`)
  // extract room array from on_live_rooms
  let non_unique_room_array = extract_non_unique_room_from_onliverooms()
  console.log('> room set list: ' + Array.from(rooms))
  console.log('> non_unique_room_array: ' + non_unique_room_array)
  if (!arraysEqual(Array.from(rooms), non_unique_room_array)){
    // Get differences, and calibrate
    var clonedSet = new Set(Array.from(rooms))
    var removed_array = [];
    // console.log('cloned set: ' + Array.from(clonedSet))
    for (let i = 0; i < non_unique_room_array.length; i++) {
      if(clonedSet.has(non_unique_room_array[i])){
        // contains in clonedSet
        clonedSet.delete(non_unique_room_array[i])
      }
      else{
        // If it does not exist in the clonedSet, remove it
        removed_array.push(non_unique_room_array[i])
      }
    }
    // Then, perform calibration..
    console.log('removed array: ' + removed_array)

    for (let i = 0; i < removed_array.length; i++) {
      close_target_room(removed_array[i], change_room=false)
      io_.emit("Client_room_list", Array.from(rooms));
    }
    // console.log('clonedSet: ' + Array.from(clonedSet))
    // console.log('rooms: ' + Array.from(rooms))
  }else{
    console.log('array equal Checked')
  }
}

const processWaiting = async () => {
  console.log('processWaiting')
  while (waiting.length) {
    while (opened.size - lived.size > 8) {
      console.log('stuck at processWaiting')
      await wait(1000)
    }
    await wait(1800)
    const { f, resolve, roomid } = waiting.shift()
    f().then(resolve).catch(() => {
      console.error('redo', roomid)
      waiting.push({ f, resolve, roomid })
      if (waiting.length === 1) {
        processWaiting()
      }
    })
  }
}

const getConf = roomid => {
  const p = new Promise(resolve => {
    waiting.push({ resolve, f: () => getConfW(roomid), roomid })
  })
  if (waiting.length === 1) {
    processWaiting()
  }
  return p
}

const reg = /(.*)【(.*)|(.*)】(.*)|^[(（"“‘]|$[)）"”’]/;

const openRoom = async ({ roomid, mid }) => {
  await wait(1000)
  const { address, key } = await getConf(roomid)
  opened.add(roomid)
  console.log(`OPEN: ${roomid}`)
  printStatus()
  const live = new KeepLiveWS(roomid, { address, key })
  on_live_rooms.push({ name: roomid, value: live })

  live.on('live', () => {
    lived.add(roomid)
    console.log(`LIVE: ${roomid}`)
    printStatus()
  })
  live.on('error', () => {
    lived.delete(roomid)
    opened.delete(roomid)
    console.log(`ERROR: ${roomid}`)
    printStatus()
  })
  // live.on('close', async () => {
  //   const { address, key } = await getConf(roomid)
  //   lived.delete(roomid)
  //   console.log(`CLOSE: ${roomid}`)
  //   printStatus()
  //   live.params[1] = { key, address }
  // })

  live.on('DANMU_MSG', async ({ info }) => {
    if (!info[0][9]) {
      var message = info[1]
      const mid = info[2][0]
      const uname = info[2][1]
      const timestamp = info[0][4]
      let matchres = message.match(reg);
      // Only send matches message to python client
      if (matchres && matchres.length > 0){
        if ([21752686, 8982686].includes(roomid)){
          console.log("room has been banned!")
        }
        else{
          message_length = message.replace(/[【】(（"“‘)）"”’]/g, "").length
          io_.send({ message, message_length, roomid, mid, uname, timestamp, global_sid})
        }
      }
      const listen_length = `living/opening: ${lived.size}/${opened.size}/${on_live_rooms.length}`
      io_.emit("Client_room_list", Array.from(rooms));
      console.log({ message, roomid, mid, uname, timestamp, listen_length})
      // console.log('room set list: ' + Array.from(rooms))
      // let non_unique_room_array = extract_non_unique_room_from_onliverooms()
      // console.log('non_unique_room_array: ' + non_unique_room_array)
    }
  })
}

const watch = ({ roomid, mid }) => {
  if (!rooms.has(roomid)) {
    rooms.add(roomid)
    console.log(`WATCH: ${roomid}`)
    openRoom({ roomid, mid })
  }
}

const close_target_room = (roomid, change_room=true) => {
  // Find result
  let result = on_live_rooms.find((e) => e.name === roomid)
  if (typeof result !== 'undefined') {
    delete_target_roomid_from_on_live_rooms(roomid, result)
    if (change_room){
      rooms.delete(roomid)
    }
    result.value.close()
    if (change_room){
      lived.delete(roomid)
      opened.delete(roomid)
      console.log(`roomid: ${roomid} closed`)
    }
    else{
      console.log(`duplicate roomid: ${roomid} closed`)
    }
  } else {
    console.log(`${roomid} not exist`)
  }
}

const delete_target_roomid_from_on_live_rooms = (roomid, result) => {
  console.log(`Before close: ${on_live_rooms.length}`)
  // Then, remove target from the list
  const index = on_live_rooms.indexOf(result)
  if (index > -1) {
    console.log(`find index: ${index}`)
    on_live_rooms.splice(index, 1)
    console.log(`After delete: ${on_live_rooms.length}`)
  } else {
    console.log('failed to find target roomid')
  }
}